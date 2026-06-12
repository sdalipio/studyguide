"""Parse PDF and Word files into a unified document structure.

Output (ParsedDoc):
  - source_type: 'pdf' | 'docx'
  - page_count: int
  - segments:   ordered list of text units, each with a human-readable `location`
  - toc:        detected structural headings (may be empty -> triggers AI topics)

Both formats reduce to the same shape so everything downstream (topic detection,
chunking, embedding) is format-agnostic.
"""
from dataclasses import dataclass, field

import fitz  # PyMuPDF
from docx import Document as DocxDocument


@dataclass
class Segment:
    text: str
    location: str
    index: int


@dataclass
class TocEntry:
    title: str
    seg_index: int  # index into segments where this heading's content begins


@dataclass
class ParsedDoc:
    source_type: str
    page_count: int
    segments: list[Segment] = field(default_factory=list)
    toc: list[TocEntry] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(s.text for s in self.segments)


def parse_pdf(data: bytes) -> ParsedDoc:
    doc = fitz.open(stream=data, filetype="pdf")
    segments: list[Segment] = []
    for page in doc:
        text = page.get_text("text").strip()
        if text:
            segments.append(
                Segment(text=text, location=f"p. {page.number + 1}", index=len(segments))
            )

    # Map each segment to the source page number so we can align the TOC.
    page_to_seg: dict[int, int] = {}
    for seg in segments:
        try:
            pg = int(seg.location.split(". ")[1])
        except (IndexError, ValueError):
            continue
        page_to_seg.setdefault(pg, seg.index)

    toc: list[TocEntry] = []
    for level, title, page in doc.get_toc():
        if level > 2:  # only top two levels become topics
            continue
        seg_index = page_to_seg.get(page)
        if seg_index is None:
            # find the first segment at or after this page
            for pg in sorted(page_to_seg):
                if pg >= page:
                    seg_index = page_to_seg[pg]
                    break
        if seg_index is not None and title.strip():
            toc.append(TocEntry(title=title.strip(), seg_index=seg_index))

    page_count = doc.page_count
    doc.close()
    return ParsedDoc(
        source_type="pdf", page_count=page_count, segments=segments, toc=toc
    )


def parse_docx(data: bytes) -> ParsedDoc:
    from io import BytesIO

    doc = DocxDocument(BytesIO(data))
    segments: list[Segment] = []
    toc: list[TocEntry] = []
    current_heading = "Introduction"

    for para in doc.paragraphs:
        text = (para.text or "").strip()
        if not text:
            continue
        style = (para.style.name or "") if para.style else ""
        is_heading = style.startswith("Heading") or style == "Title"
        if is_heading:
            current_heading = text
            toc.append(TocEntry(title=text, seg_index=len(segments)))
        segments.append(
            Segment(
                text=text,
                location=f"§ {current_heading}",
                index=len(segments),
            )
        )

    return ParsedDoc(
        source_type="docx",
        page_count=0,  # Word has no reliable page count
        segments=segments,
        toc=toc,
    )


def parse_file(filename: str, data: bytes) -> ParsedDoc:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return parse_pdf(data)
    if lower.endswith(".docx"):
        return parse_docx(data)
    raise ValueError("Unsupported file type. Upload a .pdf or .docx file.")
