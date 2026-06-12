"""Generate a small multi-topic PDF with a table of contents for testing."""
import fitz

CHAPTERS = [
    ("Photosynthesis", [
        "Photosynthesis is the process by which green plants convert light energy into chemical energy.",
        "Chlorophyll in the chloroplasts absorbs sunlight, primarily in the blue and red wavelengths.",
        "The light-dependent reactions occur in the thylakoid membranes and produce ATP and NADPH.",
        "The Calvin cycle uses ATP and NADPH to fix carbon dioxide into glucose in the stroma.",
    ]),
    ("Cellular Respiration", [
        "Cellular respiration releases energy stored in glucose to produce ATP for the cell.",
        "Glycolysis splits glucose into two pyruvate molecules in the cytoplasm.",
        "The Krebs cycle takes place in the mitochondrial matrix and generates electron carriers.",
        "Oxidative phosphorylation uses the electron transport chain to produce most of the cell's ATP.",
    ]),
    ("Genetics", [
        "Genetics is the study of heredity and the variation of inherited characteristics.",
        "DNA carries genetic information in sequences of nucleotides: adenine, thymine, guanine, cytosine.",
        "Mendel's laws describe how traits are passed from parents to offspring.",
        "A genotype is the genetic makeup, while a phenotype is the observable expression of traits.",
    ]),
]

doc = fitz.open()
toc = []
for title, paragraphs in CHAPTERS:
    page = doc.new_page()
    page.insert_text((72, 72), title, fontsize=20)
    y = 110
    for p in paragraphs:
        page.insert_text((72, y), p, fontsize=11)
        y += 24
    toc.append([1, title, doc.page_count])  # level, title, 1-based page

doc.set_toc(toc)
doc.save("test_biology.pdf")
doc.close()
print("wrote test_biology.pdf")
