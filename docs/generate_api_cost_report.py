#!/usr/bin/env python3
"""Generate PagRecovery API Cost Report PDF — concise version."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from datetime import datetime
import os

ACCENT = HexColor("#1ed760")
DARK = HexColor("#111827")
GRAY = HexColor("#6b7280")
LIGHT_BG = HexColor("#f9fafb")
BORDER = HexColor("#e5e7eb")
WHITE = white

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "PagRecovery_Custos_API_2026.pdf")


def build_styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("Title2", parent=s["Title"], fontSize=20, leading=24, textColor=DARK, spaceAfter=4, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("Sub", parent=s["Normal"], fontSize=10, leading=13, textColor=GRAY, spaceAfter=14))
    s.add(ParagraphStyle("Sec", parent=s["Heading2"], fontSize=13, leading=16, textColor=DARK, spaceBefore=16, spaceAfter=6, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("Body", parent=s["Normal"], fontSize=9, leading=12, textColor=DARK, spaceAfter=5))
    s.add(ParagraphStyle("Small", parent=s["Normal"], fontSize=8, leading=10, textColor=GRAY, spaceAfter=3))
    s.add(ParagraphStyle("Hi", parent=s["Normal"], fontSize=9.5, leading=13, textColor=HexColor("#17a94c"), fontName="Helvetica-Bold"))
    return s


def tbl(headers, rows, cw=None):
    t = Table([headers] + rows, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK), ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7), ("TOPPADDING", (0, 0), (-1, 0), 7),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4), ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ]))
    return t


def hf(canvas, doc):
    w, h = A4
    canvas.setFillColor(DARK); canvas.rect(0, h - 15*mm, w, 15*mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT); canvas.rect(0, h - 15*mm, 3*mm, 15*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE); canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(10*mm, h - 10.5*mm, "PagRecovery — Custos de API")
    canvas.setFillColor(HexColor("#9ca3af")); canvas.setFont("Helvetica", 7)
    canvas.drawRightString(w - 10*mm, h - 10.5*mm, f"Pag. {doc.page}")
    canvas.drawCentredString(w/2, 7*mm, f"Confidencial — PagRecovery {datetime.now().year}")


def build_pdf():
    s = build_styles()
    doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=A4, topMargin=22*mm, bottomMargin=14*mm, leftMargin=14*mm, rightMargin=14*mm)
    story = []
    W = A4[0] - 28*mm

    story.append(Spacer(1, 12*mm))
    story.append(Paragraph("Custos de API", s["Title2"]))
    story.append(Paragraph(f"PagRecovery — {datetime.now().strftime('%d/%m/%Y')}", s["Sub"]))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

    # ── 1. TODAS AS APIs ──
    story.append(Paragraph("1. APIs e Custos", s["Sec"]))
    story.append(tbl(
        ["API", "Uso", "Cobranca", "Custo"],
        [
            ["OpenAI GPT-4o", "IA (classificacao + msgs)", "Por token", "~US$ 0.015/lead"],
            ["WhatsApp Cloud API", "Mensagens de recuperacao", "Por conversa 24h", "~US$ 0.008/conversa"],
            ["Evolution API", "WhatsApp Web per-seller", "Self-hosted", "US$ 0"],
            ["SendGrid", "Emails de recuperacao", "Por email", "US$ 0 (free tier)"],
            ["VAPI + ElevenLabs", "Chamadas de voz", "Por minuto", "~US$ 0.15/min"],
            ["PagNet", "Gateway PIX", "Por transacao", "R$ 0,50–2,00/tx"],
            ["PagouAI", "Gateway cartao", "% sobre valor", "6,99%–23,99%"],
        ],
        [W*0.18, W*0.25, W*0.22, W*0.35],
    ))

    # ── 2. CUSTO POR LEAD ──
    story.append(Paragraph("2. Custo por Lead Recuperado", s["Sec"]))
    story.append(tbl(
        ["Cenario", "Custo/Lead", "O que usa"],
        [
            ["Minimo (Evolution, sem voz)", "~US$ 0.015", "IA + WhatsApp Web (gratis)"],
            ["Tipico (Cloud API, sem voz)", "~US$ 0.035", "IA + WhatsApp Cloud"],
            ["Completo (Cloud + voz)", "~US$ 0.33", "IA + WhatsApp + Email + Voz"],
        ],
        [W*0.32, W*0.18, W*0.50],
    ))

    # ── 3. ESCALA ──
    story.append(Paragraph("3. Projecao por Volume", s["Sec"]))
    story.append(tbl(
        ["Leads/mes", "OpenAI", "WhatsApp*", "Voz (10%)", "Total"],
        [
            ["100", "US$ 1.50", "US$ 0.80", "US$ 2.90", "US$ 5.20"],
            ["500", "US$ 7.50", "US$ 4.00", "US$ 14.50", "US$ 26.00"],
            ["1.000", "US$ 15", "US$ 8", "US$ 29", "US$ 52"],
            ["5.000", "US$ 75", "US$ 40", "US$ 145", "US$ 260"],
            ["10.000", "US$ 150", "US$ 80", "US$ 290", "US$ 520"],
        ],
        [W*0.16, W*0.18, W*0.22, W*0.22, W*0.22],
    ))
    story.append(Paragraph("* WhatsApp Cloud API. Com Evolution API, coluna WhatsApp = US$ 0.", s["Small"]))

    # ── RESUMO ──
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))
    story.append(Paragraph(
        "Custo medio: US$ 0.03/lead (~R$ 0.17) — Receita media: ~R$ 75/lead — ROI: ~440x",
        s["Hi"],
    ))

    doc.build(story, onFirstPage=hf, onLaterPages=hf)
    return OUTPUT_PATH


if __name__ == "__main__":
    print(f"PDF gerado: {build_pdf()}")
