"""Hybrid topic detection.

Strategy:
  1. If the document exposes a usable TOC / heading structure -> use it directly
     (free, instant, accurate).  topic_method = 'outline'
  2. Otherwise -> embedding-based semantic segmentation: find points where the
     content shifts (low similarity between consecutive segments), split into
     contiguous spans, and label each span with the LLM.  topic_method = 'ai'

Both paths produce contiguous, navigable topics.
"""
from dataclasses import dataclass

import numpy as np

from app.services.parsers import ParsedDoc, Segment
from app.services import embeddings, llm


@dataclass
class TopicSlice:
    title: str
    order_index: int
    segments: list[Segment]
    start_pos: int
    end_pos: int


MIN_TOPICS = 3
MAX_TOPICS = 12

# Outline entries this short are page/section dividers (e.g. a "Unit I" title
# page), not studyable topics -> skip them.
MIN_TOPIC_WORDS = 50

# Front-/back-matter outline entries that aren't real study content. Matched
# case-insensitively against the whole title (exact) or its start (prefix).
_MATTER_EXACT = {
    "title", "title page", "half title", "copyright", "copyright page",
    "dedication", "epigraph", "contributors", "contributor", "preface",
    "foreword", "contents", "table of contents", "index",
    "references", "bibliography", "glossary", "notice", "notices",
    "reviewers", "credits", "colophon", "frontmatter", "front matter",
    "acknowledgement", "acknowledgements", "acknowledgment", "acknowledgments",
}
_MATTER_PREFIX = (
    "about the author", "acknowledg", "how to use", "list of ", "index of ",
    "table of contents",
)


def _is_front_back_matter(title: str) -> bool:
    t = " ".join(title.lower().split())
    return t in _MATTER_EXACT or any(t.startswith(p) for p in _MATTER_PREFIX)


def _word_count(segments: list[Segment]) -> int:
    return sum(len(s.text.split()) for s in segments)


def detect_topics(parsed: ParsedDoc) -> tuple[str, list[TopicSlice]]:
    """Returns (topic_method, topic_slices)."""
    if _has_usable_toc(parsed):
        slices = _topics_from_toc(parsed)
        if slices:  # filtering may strip everything if the TOC was all matter
            return "outline", slices
    return "ai", _topics_from_semantics(parsed)


def _has_usable_toc(parsed: ParsedDoc) -> bool:
    # Need at least 2 headings to call it a real outline.
    return len({t.seg_index for t in parsed.toc}) >= 2


def _topics_from_toc(parsed: ParsedDoc) -> list[TopicSlice]:
    # Unique, sorted boundary indices from the TOC.
    entries = sorted(
        {t.seg_index: t.title for t in parsed.toc}.items()
    )  # list[(seg_index, title)]

    # Every entry is a boundary (so a skipped section still bounds its
    # neighbours, keeping its text out of the surrounding topics), but only
    # real content entries are emitted as topics. Front-/back-matter (Title,
    # Copyright, Preface, References, ...) and divider pages are dropped.
    slices: list[TopicSlice] = []
    for i, (start, title) in enumerate(entries):
        end = entries[i + 1][0] if i + 1 < len(entries) else len(parsed.segments)
        if _is_front_back_matter(title):
            continue
        segs = parsed.segments[start:end]
        if _word_count(segs) < MIN_TOPIC_WORDS:
            continue
        slices.append(
            TopicSlice(
                title=title,
                order_index=len(slices),
                segments=segs,
                start_pos=start,
                end_pos=end,
            )
        )
    return slices


def _topics_from_semantics(parsed: ParsedDoc) -> list[TopicSlice]:
    segs = parsed.segments
    if len(segs) <= MIN_TOPICS:
        # Too small to segment meaningfully -> single topic.
        return [_label_slices(parsed, [(0, len(segs))])][0] if segs else []

    vecs = np.array(embeddings.embed_texts([s.text[:1000] for s in segs]))
    # Cosine similarity between consecutive segments (vectors are normalized).
    sims = np.sum(vecs[:-1] * vecs[1:], axis=1)

    # Candidate boundaries = biggest drops in similarity.
    target = int(np.clip(round(len(segs) / 8), MIN_TOPICS, MAX_TOPICS))
    n_boundaries = max(target - 1, 1)
    # indices (into sims) of the lowest-similarity adjacencies
    cut_order = np.argsort(sims)
    cuts = sorted(int(i) + 1 for i in cut_order[:n_boundaries])

    spans: list[tuple[int, int]] = []
    prev = 0
    for c in cuts:
        if c - prev >= 1:
            spans.append((prev, c))
            prev = c
    spans.append((prev, len(segs)))

    return _label_all(parsed, spans)


def _label_all(parsed: ParsedDoc, spans: list[tuple[int, int]]) -> list[TopicSlice]:
    slices: list[TopicSlice] = []
    for order, (start, end) in enumerate(spans):
        segs = parsed.segments[start:end]
        if not segs:
            continue
        title = _label_span(segs, order)
        slices.append(
            TopicSlice(
                title=title,
                order_index=len(slices),
                segments=segs,
                start_pos=start,
                end_pos=end,
            )
        )
    return slices


def _label_slices(parsed: ParsedDoc, spans):
    return _label_all(parsed, spans)


def _label_span(segs: list[Segment], order: int) -> str:
    """Ask the LLM for a short topic title for a span of text."""
    excerpt = "\n".join(s.text for s in segs)[:2500]
    try:
        title = llm.complete(
            system=(
                "You name study topics. Given an excerpt, reply with a concise, "
                "specific topic title of 2-6 words. No quotes, no prefixes."
            ),
            user=excerpt,
        ).strip().strip('"')
        # guard against the model returning a paragraph
        if title and len(title) <= 80:
            return title
    except Exception:
        pass
    return f"Section {order + 1}"
