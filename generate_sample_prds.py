"""
Generator for Sample AI Hardware Project PRDs in PDF format.
"""

import os
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# Output directories
DIRS = [Path("samples"), Path("frontend/public/samples")]
for d in DIRS:
    d.mkdir(parents=True, exist_ok=True)

# Styling palette
PRIMARY = colors.HexColor("#1c0b26")
SECONDARY = colors.HexColor("#3e1b53")
MARIGOLD = colors.HexColor("#f59e0b")
AMBER_DARK = colors.HexColor("#d97706")
BG_LIGHT = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#cbd5e1")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleStyle",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=PRIMARY,
    spaceAfter=4,
)

subtitle_style = ParagraphStyle(
    "SubtitleStyle",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    leading=12,
    textColor=AMBER_DARK,
    textTransform="uppercase",
    spaceAfter=10,
)

body_style = ParagraphStyle(
    "BodyStyle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=colors.HexColor("#334155"),
    spaceAfter=8,
)

heading_style = ParagraphStyle(
    "HeadingStyle",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    textColor=SECONDARY,
    spaceBefore=10,
    spaceAfter=6,
)

cell_bold = ParagraphStyle("CellBold", parent=body_style, fontName="Helvetica-Bold", fontSize=9, leading=12)
cell_normal = ParagraphStyle("CellNormal", parent=body_style, fontSize=9, leading=12)


def create_pdf(filepath: Path, title: str, subtitle: str, summary: str, specs: list, requirements_text: str):
    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    elements = []

    # Header
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(subtitle, subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=MARIGOLD, spaceAfter=12))

    # Summary
    elements.append(Paragraph("1. Project Executive Overview", heading_style))
    elements.append(Paragraph(summary, body_style))
    elements.append(Spacer(1, 8))

    # Structured Specifications Table
    elements.append(Paragraph("2. Technical & Hardware Constraints Matrix", heading_style))
    table_data = [[Paragraph("Parameter", cell_bold), Paragraph("Specification Value", cell_bold), Paragraph("Architectural Note", cell_bold)]]
    for param, val, note in specs:
        table_data.append([Paragraph(param, cell_bold), Paragraph(val, cell_normal), Paragraph(note, cell_normal)])

    spec_table = Table(table_data, colWidths=[150, 160, 200])
    spec_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ])
    )
    elements.append(spec_table)
    elements.append(Spacer(1, 12))

    # Detailed requirements
    elements.append(Paragraph("3. Deployment & Operational Requirements", heading_style))
    elements.append(Paragraph(requirements_text, body_style))
    elements.append(Spacer(1, 14))

    # Footer note
    footer_text = "Generated for Bharat AI Platform · Document Specification Engine · Compliant with Make in India Sovereign Computing Guidelines."
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))
    elements.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=colors.HexColor("#94a3b8"))))

    doc.build(elements)
    print(f"Created: {filepath}")


# 1. Edge Drone Vision Surveillance PRD
specs_drone = [
    ("Model Architecture", "MobileNetV2 / YOLOv8 Nano Edge Vision", "Lightweight inverted residual convolutional network"),
    ("Model Parameter Count", "25 Million parameters (0.025B)", "Target footprint under 50 MB in memory"),
    ("Weight Precision", "INT8 Quantized (PTQ / QAT)", "Optimized for integer tensor processing cores"),
    ("Target Output Time / Latency", "18 ms per frame (under 20 ms)", "Hard real-time deadline for autonomous collision avoidance"),
    ("Target Throughput", "45 FPS (Frames Per Second)", "Continuous video stream processing at 1080p resolution"),
    ("Target Budget", "INR 25,000 (Rs. 25,000)", "Unit bill-of-materials capital expenditure ceiling"),
    ("Thermal Power Envelope", "15 Watts TDP (under 18 W)", "Strict battery-powered payload limitation for UAV flight endurance"),
    ("Batch Size", "1 frame", "Zero buffering for instantaneous closed-loop steering"),
    ("Sovereign Silicon Preference", "Make in India / High Preference", "Preference for domestic Indian processors such as Vicharak Vaaman"),
]

req_drone = (
    "The drone payload system requires continuous edge vision inference deployed on an onboard single-board computer (SBC). "
    "To maximize battery endurance, total system power consumption must remain strictly below 15 Watts TDP. "
    "The camera feed is processed at 45 FPS with an output latency barrier under 18 ms. "
    "Cost efficiency is paramount; total accelerator budget is capped at INR 25,000 (Rs. 25,000) per unit. "
    "Indian sovereign hardware like the Vicharak Vaaman (Rockchip RK3588 NPU) or Jetson Orin Nano is evaluated for domestic deployment."
)

for d in DIRS:
    create_pdf(
        d / "Edge_Drone_Vision_Surveillance_PRD.pdf",
        "Product Requirement Document (PRD): Edge Drone Vision Surveillance",
        "Autonomous UAV Real-Time Vision & Collision Avoidance Specification",
        "This specification outlines hardware requirements for deploying an onboard real-time computer vision system for agricultural and perimeter surveillance UAVs in India.",
        specs_drone,
        req_drone,
    )


# 2. Enterprise Sovereign LLM Server PRD
specs_llm = [
    ("Model Architecture", "Indic-Mistral-7B Large Language Model", "Transformer decoder with grouped-query attention"),
    ("Model Parameter Count", "7 Billion parameters (7.0B)", "7B dense parameters for multilingual Hindi/Tamil/Telugu processing"),
    ("Weight Precision", "FP16 (Half Precision)", "16-bit floating point for optimal generation perplexity"),
    ("Target Output Time / TTFT", "45 ms (Time to First Token)", "Sub-50ms conversational responsiveness for enterprise chatbot"),
    ("Target Throughput", "60 tokens per second (tok/s)", "Real-time streaming text generation for user interactions"),
    ("Target Budget", "INR 2,50,000 (Rs. 250,000)", "Workstation / on-premise edge server investment"),
    ("Thermal Power Envelope", "450 Watts TDP", "Standard dual-slot PCIe workstation cooling infrastructure"),
    ("Context Window Length", "4096 tokens", "Accommodates long-context document Q&A and RAG grounding"),
    ("Concurrent User Streams", "8 active streams", "Dynamic continuous batching via vLLM inference engine"),
    ("Deployment Technology", "vLLM / Docker Container", "OpenAI-compatible HTTP REST endpoint on internal network"),
]

req_llm = (
    "This project deploys a sovereign on-premise Large Language Model server for an Indian financial institution. "
    "Due to strict data residency and privacy compliance, all customer document summaries must execute on-premise without cloud transmission. "
    "The model has 7 Billion parameters running in FP16 precision with a 4096-token context window. "
    "Target performance requires streaming throughput of at least 60 tokens per second and Time to First Token (TTFT) under 45 ms. "
    "The hardware budget is INR 250,000 (Rs. 2,50,000) with an allowable thermal envelope up to 450 Watts TDP."
)

for d in DIRS:
    create_pdf(
        d / "Enterprise_Sovereign_LLM_Server_PRD.pdf",
        "Product Requirement Document (PRD): Enterprise Sovereign LLM Server",
        "On-Premise 7B Multilingual LLM Infrastructure Specification",
        "This document defines the deployment specification for an on-premise conversational AI server utilizing a 7 Billion parameter multilingual model with strict data residency requirements.",
        specs_llm,
        req_llm,
    )


# 3. Industrial Defect Inspection System PRD
specs_defect = [
    ("Model Architecture", "ResNet-50 Industrial Defect Classifier", "Deep residual convolutional neural network"),
    ("Model Parameter Count", "25.5 Million parameters (0.026B)", "Optimized for feature extraction on microscopic surface flaws"),
    ("Weight Precision", "FP16 / Half Precision", "Retains micro-crack detection sensitivity without precision clipping"),
    ("Target Output Time / Latency", "25 ms per part (under 30 ms)", "Synchronized with industrial assembly conveyor belt speed"),
    ("Target Throughput", "60 FPS (Inspection Frames/Sec)", "High-speed line inspection with industrial GigE vision cameras"),
    ("Target Budget", "INR 75,000 (Rs. 75,000)", "Factory floor edge box deployment ceiling"),
    ("Thermal Power Envelope", "75 Watts TDP", "Passive or DIN-rail fanless enclosure for dusty environments"),
    ("Make in India Silicon", "Medium / Preferred", "Evaluating domestic industrial boards and certified rugged accelerators"),
]

req_defect = (
    "Deployed across manufacturing shop floors in Pune and Chennai, this automated optical inspection (AOI) system "
    "classifies manufactured mechanical parts for micro-fractures and surface defects at 60 FPS. "
    "Each image requires decision latency under 25 ms. "
    "The edge compute unit operates inside an IP65 sealed enclosure with a thermal ceiling of 75 Watts TDP and a target procurement budget of INR 75,000 (Rs. 75,000)."
)

for d in DIRS:
    create_pdf(
        d / "Industrial_Defect_Inspection_System_PRD.pdf",
        "Product Requirement Document (PRD): Industrial Defect Inspection",
        "High-Speed Manufacturing Line Surface Quality Inspection Specification",
        "Specification for deploying high-speed computer vision defect classifiers in automotive manufacturing lines across India.",
        specs_defect,
        req_defect,
    )
