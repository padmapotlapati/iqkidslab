"""PDF report + certificate generation via reportlab."""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import qrcode

from questions_data import CATEGORY_LABELS


BRAND_BLUE = colors.HexColor("#3B82F6")
BRAND_PURPLE = colors.HexColor("#8B5CF6")
BRAND_ORANGE = colors.HexColor("#F59E0B")
BRAND_PINK = colors.HexColor("#EC4899")
BRAND_INK = colors.HexColor("#0F172A")
BRAND_SOFT = colors.HexColor("#F1F5F9")


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=BRAND_INK, spaceAfter=8))
    styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BRAND_PURPLE, spaceAfter=6, spaceBefore=14))
    styles.add(ParagraphStyle(name="BodyX", fontName="Helvetica", fontSize=11, leading=16, textColor=BRAND_INK, spaceAfter=6))
    styles.add(ParagraphStyle(name="Muted", fontName="Helvetica", fontSize=9, leading=12, textColor=colors.grey))
    styles.add(ParagraphStyle(name="BadgeCenter", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.white, alignment=TA_CENTER))
    return styles


def build_report_pdf(child: dict, assessment: dict, ai_report: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=18 * mm)
    st = _styles()
    story = []

    # Header band
    header_data = [[Paragraph("KIDS IQ TEST", ParagraphStyle(name="brand", fontName="Helvetica-Bold", fontSize=12, textColor=colors.white)),
                    Paragraph(f"Brain-Skills Report<br/><font size=8 color='#E9D8FD'>Educational estimate — not a clinical diagnosis</font>",
                              ParagraphStyle(name="brand2", fontName="Helvetica-Bold", fontSize=16, textColor=colors.white, alignment=2))]]
    ht = Table(header_data, colWidths=[80 * mm, 90 * mm])
    ht.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PURPLE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("ROUNDEDCORNERS", [10, 10, 10, 10]),
    ]))
    story.append(ht)
    story.append(Spacer(1, 16))

    story.append(Paragraph(f"Great job, {child.get('name', 'Champion')}!", st["H1x"]))
    story.append(Paragraph(
        f"<b>Age:</b> {child.get('age')} &nbsp; <b>Age group:</b> {child.get('age_group')} &nbsp; <b>Date:</b> {datetime.now().strftime('%b %d, %Y')}",
        st["BodyX"],
    ))

    # KPI card row
    kpi = [
        ["Overall", "Estimated Index", "Percentile", "XP Earned"],
        [f"{assessment.get('overall_score', 0)}%",
         str(assessment.get("estimated_index", "-")),
         f"{assessment.get('percentile', '-')}th",
         f"+{assessment.get('xp_earned', 0)}"],
    ]
    kpi_tbl = Table(kpi, colWidths=[42 * mm] * 4)
    kpi_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("BACKGROUND", (0, 1), (-1, 1), BRAND_SOFT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("TEXTCOLOR", (0, 1), (-1, 1), BRAND_INK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, 1), 18),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(Spacer(1, 10))
    story.append(kpi_tbl)

    # Category breakdown
    story.append(Paragraph("Category breakdown", st["H2x"]))
    cat_rows = [["Category", "Correct", "Score", "Percentile"]]
    for cat, s in (assessment.get("category_scores") or {}).items():
        cat_rows.append([
            CATEGORY_LABELS.get(cat, cat),
            f"{s['correct']}/{s['total']}",
            f"{s['score']}%",
            f"{s['percentile']}th",
        ])
    cat_tbl = Table(cat_rows, colWidths=[65 * mm, 30 * mm, 30 * mm, 30 * mm])
    cat_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_SOFT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(cat_tbl)

    # ---- Strengths & Areas for Improvement ----
    strengths = assessment.get("strengths") or []
    growth = assessment.get("growth_areas") or []
    if strengths or growth:
        story.append(Paragraph("Strengths &amp; Areas for Improvement", st["H2x"]))
        sg_rows = [["Strengths", "Areas for Improvement"],
                   [", ".join([CATEGORY_LABELS.get(s, s) for s in strengths]) or "—",
                    ", ".join([CATEGORY_LABELS.get(g, g) for g in growth]) or "Well-rounded — keep going!"]]
        sg_tbl = Table(sg_rows, colWidths=[77 * mm, 77 * mm])
        sg_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#10B981")),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F97316")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTSIZE", (0, 1), (-1, 1), 10),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#ECFDF5")),
            ("BACKGROUND", (1, 1), (1, 1), colors.HexColor("#FFF7ED")),
        ]))
        story.append(sg_tbl)

    # ---- Personalized Tips ----
    tips_map = {
        "memory": "Play card-matching games and recite grocery lists to strengthen short-term recall.",
        "logical_reasoning": "Solve one Sudoku or logic riddle daily — start easy and build up.",
        "pattern_recognition": "Look for number and shape patterns in everyday objects (tiles, music).",
        "visual_intelligence": "Try puzzle building or spot-the-difference games for 10 minutes.",
        "attention": "Practice focused reading — 15-minute distraction-free sessions.",
        "processing_speed": "Timed mental-math drills for 5 minutes daily boost speed.",
        "problem_solving": "Try one word problem or riddle before bed to stretch reasoning.",
        "mathematical_thinking": "Practice fractions/percentages using real-life examples (recipes, prices).",
        "language_skills": "Read for 20 minutes daily and note 3 new words each day.",
        "creativity": "Brainstorm 5 uses for a household object every morning.",
    }
    parent_map = {
        "memory": "Play memory games together; encourage retelling stories with details.",
        "logical_reasoning": "Ask 'why' and 'what if' questions during casual conversations.",
        "pattern_recognition": "Point out patterns in nature, music, or architecture together.",
        "visual_intelligence": "Do jigsaw puzzles or draw side-by-side.",
        "attention": "Establish quiet-time routines; celebrate focused practice.",
        "processing_speed": "Turn mental math into a fun daily race.",
        "problem_solving": "Involve them in real-world planning (packing a trip, budget).",
        "mathematical_thinking": "Cook together — measuring/scaling is math practice.",
        "language_skills": "Read aloud together; discuss the story afterwards.",
        "creativity": "Encourage open-ended play with blocks or drawing.",
    }
    focus = growth[:3] if growth else strengths[:3]

    if focus:
        story.append(Paragraph("Personalized Tips", st["H2x"]))
        for cat in focus:
            story.append(Paragraph(
                f"<b>{CATEGORY_LABELS.get(cat, cat)}:</b> {tips_map.get(cat, 'Stay curious and keep exploring!')}",
                st["BodyX"],
            ))

    # ---- Daily Practice Suggestions ----
    story.append(Paragraph("Daily Practice Suggestions", st["H2x"]))
    for item in [
        "<b>Morning:</b> 3 quick riddles or brain teasers",
        "<b>Afternoon:</b> 15-20 minutes of reading + 2 new words",
        "<b>Evening:</b> 5-10 minutes of a Brain Skills game",
        "<b>Before bed:</b> Reflect on 1 thing learned today",
    ]:
        story.append(Paragraph(f"• {item}", st["BodyX"]))

    # ---- Weekly Goals ----
    story.append(Paragraph("Weekly Goals", st["H2x"]))
    goal_items = []
    for g in (growth[:2] or []):
        goal_items.append(f"Improve {CATEGORY_LABELS.get(g, g)} score by ~10% this week")
    goal_items.append("Complete at least 3 brain games this week")
    goal_items.append("Play any game 5 days in a row (build the streak)")
    for gi in goal_items:
        story.append(Paragraph(f"✓ {gi}", st["BodyX"]))

    # ---- Parent Guidance ----
    if focus:
        story.append(Paragraph("Parent Guidance", st["H2x"]))
        for cat in focus:
            story.append(Paragraph(
                f"<b>{CATEGORY_LABELS.get(cat, cat)}:</b> {parent_map.get(cat, 'Encourage curiosity and celebrate every small win.')}",
                st["BodyX"],
            ))

    # AI Insights (parsed markdown-ish)
    story.append(Paragraph("AI Learning Insights", st["H2x"]))
    for line in (ai_report or "").split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
        elif line.startswith("## "):
            story.append(Paragraph(f"<b>{line[3:]}</b>", ParagraphStyle(name="sub", fontName="Helvetica-Bold", fontSize=12, textColor=BRAND_ORANGE, spaceBefore=6, spaceAfter=4)))
        elif line.startswith("- "):
            story.append(Paragraph(f"• {line[2:]}", st["BodyX"]))
        else:
            story.append(Paragraph(line, st["BodyX"]))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "Disclaimer: Kids IQ Test provides educational cognitive skill estimates and learning insights only. "
        "It is NOT a clinical IQ diagnosis. For any developmental or medical concerns, consult a qualified professional.",
        st["Muted"],
    ))

    doc.build(story)
    return buf.getvalue()


def build_certificate_pdf(child: dict, assessment: dict, certificate_id: str, qr_data_url: str) -> bytes:
    buf = io.BytesIO()
    # Landscape A4
    from reportlab.lib.pagesizes import landscape
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    w, h = landscape(A4)

    # Background gradient (simulated with rectangles)
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Decorative bar
    c.setFillColor(BRAND_PURPLE)
    c.rect(0, h - 30 * mm, w, 30 * mm, fill=1, stroke=0)
    c.setFillColor(BRAND_ORANGE)
    c.rect(0, 0, w, 20 * mm, fill=1, stroke=0)

    # Border
    c.setStrokeColor(BRAND_BLUE)
    c.setLineWidth(3)
    c.roundRect(15 * mm, 25 * mm, w - 30 * mm, h - 55 * mm, 10, stroke=1, fill=0)

    # Title
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(w / 2, h - 18 * mm, "KIDS IQ TEST")

    # Certificate title
    c.setFillColor(BRAND_INK)
    c.setFont("Helvetica-Bold", 40)
    c.drawCentredString(w / 2, h - 60 * mm, "Certificate of Achievement")

    c.setFont("Helvetica", 14)
    c.drawCentredString(w / 2, h - 75 * mm, "This certificate is proudly presented to")

    # Child name
    c.setFillColor(BRAND_PURPLE)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(w / 2, h - 100 * mm, child.get("name", "Champion"))

    # Body
    c.setFillColor(BRAND_INK)
    c.setFont("Helvetica", 13)
    body = f"For successfully completing the Kids IQ Test brain-skills assessment (Age {child.get('age_group')})"
    c.drawCentredString(w / 2, h - 118 * mm, body)
    c.drawCentredString(w / 2, h - 130 * mm, f"scoring {assessment.get('overall_score', 0)}% overall with an estimated index of {assessment.get('estimated_index', '-')}.")

    # Date + Cert ID
    c.setFont("Helvetica", 11)
    date_str = datetime.now().strftime("%B %d, %Y")
    c.drawString(35 * mm, 45 * mm, f"Date: {date_str}")
    c.drawString(35 * mm, 38 * mm, f"Certificate ID: {certificate_id}")

    # Signature line
    c.setStrokeColor(BRAND_INK)
    c.setLineWidth(0.8)
    c.line(w - 90 * mm, 45 * mm, w - 35 * mm, 45 * mm)
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(w - 62.5 * mm, 40 * mm, "Kids IQ Test — Learning Team")

    # QR code
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=4, border=2)
    qr.add_data(qr_data_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    c.drawImage(ImageReader(qr_buf),
                w - 45 * mm, 50 * mm, width=28 * mm, height=28 * mm, mask="auto")

    # Footer disclaimer
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.white)
    c.drawCentredString(w / 2, 10 * mm, "Educational estimate — not a clinical IQ diagnosis. Verify at " + qr_data_url)

    c.save()
    return buf.getvalue()
