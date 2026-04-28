#!/usr/bin/env python3
"""Generate PagRecovery Platform Cost & Revenue Report PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from datetime import datetime
import os

# ── Colors ──
ACCENT = HexColor("#1ed760")
ACCENT_DARK = HexColor("#17a94c")
DARK = HexColor("#111827")
GRAY = HexColor("#6b7280")
LIGHT_BG = HexColor("#f9fafb")
BORDER = HexColor("#e5e7eb")
WHITE = white

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "PagRecovery_Custos_e_Receitas_2026.pdf")

def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Title2", parent=styles["Title"],
        fontSize=22, leading=26, textColor=DARK,
        spaceAfter=4, fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=11, leading=14, textColor=GRAY,
        spaceAfter=16,
    ))
    styles.add(ParagraphStyle(
        "SectionHeader", parent=styles["Heading2"],
        fontSize=14, leading=18, textColor=DARK,
        spaceBefore=20, spaceAfter=8, fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "SubSection", parent=styles["Heading3"],
        fontSize=11, leading=14, textColor=ACCENT_DARK,
        spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=9.5, leading=13, textColor=DARK,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        "BodySmall", parent=styles["Normal"],
        fontSize=8.5, leading=11, textColor=GRAY,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "Footer", parent=styles["Normal"],
        fontSize=7.5, leading=9, textColor=GRAY,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "TableHeader", parent=styles["Normal"],
        fontSize=8.5, leading=11, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "TableCell", parent=styles["Normal"],
        fontSize=8.5, leading=11, textColor=DARK,
    ))
    styles.add(ParagraphStyle(
        "TableCellRight", parent=styles["Normal"],
        fontSize=8.5, leading=11, textColor=DARK, alignment=TA_RIGHT,
    ))
    styles.add(ParagraphStyle(
        "Highlight", parent=styles["Normal"],
        fontSize=9.5, leading=13, textColor=ACCENT_DARK,
        fontName="Helvetica-Bold",
    ))
    return styles


def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    data = [headers] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
    ]
    t.setStyle(TableStyle(style))
    return t


def add_header_footer(canvas, doc):
    """Draw header bar and footer on each page."""
    w, h = A4
    # Header bar
    canvas.setFillColor(DARK)
    canvas.rect(0, h - 18*mm, w, 18*mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 18*mm, 4*mm, 18*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(12*mm, h - 12*mm, "PagRecovery")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(HexColor("#9ca3af"))
    canvas.drawString(12*mm, h - 16*mm, "Plataforma de Recuperacao de Pagamentos")
    canvas.drawRightString(w - 12*mm, h - 12*mm, f"Pagina {doc.page}")
    # Footer
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(w/2, 8*mm, f"Documento confidencial — PagRecovery © {datetime.now().year}")


def build_pdf():
    styles = build_styles()
    doc = SimpleDocTemplate(
        OUTPUT_PATH, pagesize=A4,
        topMargin=24*mm, bottomMargin=16*mm,
        leftMargin=16*mm, rightMargin=16*mm,
    )
    story = []
    W = A4[0] - 32*mm  # usable width

    # ── COVER ──
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph("Estrutura de Custos, Taxas e Receitas", styles["Title2"]))
    story.append(Paragraph(
        f"PagRecovery — Plataforma White-Label de Recuperacao de Pagamentos<br/>"
        f"Documento gerado em {datetime.now().strftime('%d/%m/%Y')}",
        styles["Subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=12))

    story.append(Paragraph(
        "Este documento detalha todos os custos operacionais, taxas de gateway, "
        "estrutura de split, servicos externos e modelo de receita da plataforma "
        "PagRecovery e seus deployments white-label (Shield Recovery).",
        styles["Body"],
    ))

    story.append(Spacer(1, 8*mm))

    # Summary box
    summary_data = [
        ["Metrica", "Valor"],
        ["Modelo de receita", "Performance fee sobre valor recuperado"],
        ["Taxa padrao da plataforma", "Configuravel por seller (split config)"],
        ["Gateways integrados", "PagNet (PIX), PagouAI (cartao), Shield Gateway"],
        ["Deployments ativos", "PagRecovery + Shield Recovery + Checkout"],
        ["Canais de recuperacao", "WhatsApp, Email, SMS, Voz (VAPI/ElevenLabs)"],
        ["IA", "OpenAI GPT-4 (classificacao + geracao de mensagens)"],
    ]
    story.append(make_table(summary_data[0], summary_data[1:], col_widths=[W*0.38, W*0.62]))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════
    # PAGE 2 — INFRAESTRUTURA
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Custos de Infraestrutura", styles["SectionHeader"]))
    story.append(Paragraph(
        "Servicos de hosting, banco de dados e deploy da plataforma.",
        styles["BodySmall"],
    ))

    infra_data = [
        ["Servico", "Uso", "Plano", "Custo Mensal (est.)"],
        ["Vercel", "Hosting + Edge + Cron (3 deploys)", "Pro", "US$ 20/mes"],
        ["Supabase", "PostgreSQL + Auth + Storage", "Free → Pro", "US$ 0–25/mes"],
        ["Dominio pagrecovery.com", "DNS + dominio principal", "Anual", "~R$ 50/ano"],
        ["GitHub", "Repositorios privados (2)", "Free", "US$ 0"],
    ]
    story.append(make_table(infra_data[0], infra_data[1:], col_widths=[W*0.22, W*0.32, W*0.2, W*0.26]))

    story.append(Paragraph("Subtotal infra estimado: US$ 20–45/mes", styles["Highlight"]))

    # ══════════════════════════════════════════════════════════════════
    # SERVICOS EXTERNOS
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Servicos Externos (APIs)", styles["SectionHeader"]))

    api_data = [
        ["Servico", "Finalidade", "Modelo de Cobranca", "Custo Estimado"],
        ["OpenAI (GPT-4)", "Classificacao de leads + geracao de msgs", "Por token", "US$ 5–30/mes*"],
        ["WhatsApp Cloud API", "Envio/recebimento de mensagens", "Por conversa (24h)", "~US$ 0.05/conversa"],
        ["Evolution API", "WhatsApp Web (QR code per-seller)", "Self-hosted", "US$ 0 (incluso VPS)"],
        ["SendGrid", "Envio de emails de recuperacao", "Por email", "US$ 0 (free tier 100/dia)"],
        ["VAPI / ElevenLabs", "Chamadas de voz automatizadas", "Por minuto", "US$ 0.05–0.15/min"],
        ["PagNet Brasil", "Gateway PIX (processamento)", "Por transacao", "Ver secao Gateways"],
        ["PagouAI", "Gateway cartao de credito", "Por transacao", "Ver secao Gateways"],
    ]
    story.append(make_table(api_data[0], api_data[1:], col_widths=[W*0.18, W*0.30, W*0.22, W*0.30]))

    story.append(Paragraph(
        "* Custo OpenAI varia com volume de leads. ~500 leads/mes = ~US$ 10. "
        "Escala linear com uso.",
        styles["BodySmall"],
    ))

    # ══════════════════════════════════════════════════════════════════
    # TAXAS DE GATEWAY
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Taxas de Gateway de Pagamento", styles["SectionHeader"]))

    story.append(Paragraph("3.1 PagouAI — Cartao de Credito", styles["SubSection"]))

    card_data = [
        ["Parcelas", "Taxa Total", "Observacao"],
        ["1x (a vista)", "6,99% + R$ 3,49", "Taxa base"],
        ["2x", "11,89%", "Sem juros pro cliente"],
        ["3x", "13,29%", "Sem juros pro cliente"],
        ["4x", "14,74%", "Sem juros pro cliente"],
        ["5x", "15,97%", "Sem juros pro cliente"],
        ["6x", "16,65%", "Sem juros pro cliente"],
        ["7x", "16,99%", "Sem juros pro cliente"],
        ["8x", "17,01%", "Sem juros pro cliente"],
        ["9x", "17,99%", "Sem juros pro cliente"],
        ["10x", "18,01%", "Sem juros pro cliente"],
        ["11x", "18,99%", "Sem juros pro cliente"],
        ["12x", "23,99%", "Sem juros pro cliente"],
    ]
    story.append(make_table(card_data[0], card_data[1:], col_widths=[W*0.2, W*0.3, W*0.5]))
    story.append(Paragraph("Reserva (antecipacao): 25% retido, liberado apos ciclo", styles["BodySmall"]))

    story.append(Paragraph("3.2 PagNet Brasil — PIX", styles["SubSection"]))
    story.append(Paragraph(
        "O PIX via PagNet tem taxa fixa por transacao definida no contrato do seller. "
        "Tipicamente entre R$ 0,50 e R$ 2,00 por PIX recebido, dependendo do volume negociado.",
        styles["Body"],
    ))

    story.append(Paragraph("3.3 Shield Gateway", styles["SubSection"]))
    story.append(Paragraph(
        "Gateway proprio da Shield Recovery. Taxas definidas pelo contrato entre Shield e seus sellers. "
        "A PagRecovery nao cobra sobre o gateway — a monetizacao e pela taxa de recuperacao (split).",
        styles["Body"],
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════
    # PAGE 3 — MODELO DE RECEITA
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Modelo de Receita — Split de Recuperacao", styles["SectionHeader"]))
    story.append(Paragraph(
        "A PagRecovery monetiza cobrando uma porcentagem sobre cada pagamento "
        "recuperado com sucesso. O split e calculado automaticamente pelo Checkout Platform.",
        styles["Body"],
    ))

    split_data = [
        ["Parametro", "Valor Padrao", "Configuravel?"],
        ["Taxa padrao da plataforma (defaultFeePercent)", "Definido no split-config", "Sim, pelo admin"],
        ["Override por seller (merchantOverride)", "Personalizado", "Sim, por seller"],
        ["Periodo de retencao (holdPeriodDays)", "Configuravel", "Sim"],
        ["Valor minimo de saque (minPayoutAmount)", "Configuravel", "Sim"],
        ["Auto-approve de saques", "Configuravel", "Sim"],
    ]
    story.append(make_table(split_data[0], split_data[1:], col_widths=[W*0.42, W*0.30, W*0.28]))

    story.append(Paragraph("4.1 Fluxo do Split", styles["SubSection"]))
    flow_text = (
        "1. Cliente paga via checkout (PIX ou cartao)<br/>"
        "2. Checkout Platform registra o pagamento bruto<br/>"
        "3. Sistema calcula: <b>Fee = valor_bruto x feePercent</b><br/>"
        "4. <b>Liquido seller = valor_bruto - fee</b><br/>"
        "5. Fee fica com a plataforma (PagRecovery)<br/>"
        "6. Liquido fica disponivel para saque pelo seller apos holdPeriodDays"
    )
    story.append(Paragraph(flow_text, styles["Body"]))

    story.append(Paragraph("4.2 Exemplo de Calculo", styles["SubSection"]))

    example_data = [
        ["Item", "Valor"],
        ["Pagamento recuperado", "R$ 500,00"],
        ["Taxa plataforma (ex: 15%)", "R$ 75,00"],
        ["Liquido seller", "R$ 425,00"],
        ["Taxa gateway PIX (~R$ 1,00)", "R$ 1,00"],
        ["Receita liquida plataforma", "R$ 74,00"],
    ]
    story.append(make_table(example_data[0], example_data[1:], col_widths=[W*0.55, W*0.45]))

    # ══════════════════════════════════════════════════════════════════
    # MODELO WHITE-LABEL
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Arquitetura White-Label", styles["SectionHeader"]))

    wl_data = [
        ["Deployment", "URL", "Brand", "Gateway Padrao"],
        ["PagRecovery", "pagrecovery.com", "PagRecovery", "PagNet / PagouAI"],
        ["Shield Recovery", "shield-recovery.vercel.app", "Shield", "Shield Gateway"],
        ["Checkout", "pagrecovery.com/checkout", "PagRecovery", "PagNet"],
    ]
    story.append(make_table(wl_data[0], wl_data[1:], col_widths=[W*0.22, W*0.32, W*0.2, W*0.26]))

    story.append(Paragraph(
        "Todos os deployments compartilham o mesmo codebase. Cada um possui suas proprias "
        "variaveis de ambiente, banco Supabase e configuracoes de gateway. "
        "Novos white-labels sao criados adicionando um novo projeto Vercel + env vars.",
        styles["Body"],
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════
    # PAGE 4 — CUSTOS POR OPERACAO
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Custo por Operacao de Recuperacao", styles["SectionHeader"]))
    story.append(Paragraph(
        "Custo marginal de cada lead que entra na plataforma e passa pelo fluxo de recuperacao.",
        styles["BodySmall"],
    ))

    op_data = [
        ["Etapa", "Servico", "Custo Unitario"],
        ["Webhook recebido", "Vercel (serverless)", "Incluso no plano"],
        ["Classificacao IA", "OpenAI GPT-4", "~US$ 0.01–0.03"],
        ["Geracao de mensagem IA", "OpenAI GPT-4", "~US$ 0.01–0.02"],
        ["Envio WhatsApp (1a msg)", "WhatsApp Cloud API", "~US$ 0.05"],
        ["Envio WhatsApp (follow-ups)", "WhatsApp Cloud API", "~US$ 0.05/cada"],
        ["Envio email", "SendGrid", "US$ 0 (free tier)"],
        ["Chamada de voz (opcional)", "VAPI/ElevenLabs", "~US$ 0.10/min"],
        ["Processamento checkout", "Vercel + Supabase", "Incluso no plano"],
        ["Envio PIX (payout seller)", "PagNet", "~R$ 1,00"],
    ]
    story.append(make_table(op_data[0], op_data[1:], col_widths=[W*0.30, W*0.32, W*0.38]))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Custo total estimado por lead recuperado: US$ 0.15 – 0.30 "
        "(sem voz: ~US$ 0.15, com voz: ~US$ 0.30)",
        styles["Highlight"],
    ))

    # ══════════════════════════════════════════════════════════════════
    # CENARIOS DE ESCALA
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Projecao de Custos por Volume", styles["SectionHeader"]))

    scale_data = [
        ["Volume mensal", "Custo Infra", "Custo APIs", "Custo Total", "Receita (15% split)*"],
        ["100 leads", "~US$ 25", "~US$ 15", "~US$ 40", "R$ 7.500"],
        ["500 leads", "~US$ 35", "~US$ 60", "~US$ 95", "R$ 37.500"],
        ["1.000 leads", "~US$ 45", "~US$ 120", "~US$ 165", "R$ 75.000"],
        ["5.000 leads", "~US$ 70", "~US$ 500", "~US$ 570", "R$ 375.000"],
        ["10.000 leads", "~US$ 100", "~US$ 950", "~US$ 1.050", "R$ 750.000"],
    ]
    story.append(make_table(scale_data[0], scale_data[1:], col_widths=[W*0.18, W*0.17, W*0.17, W*0.20, W*0.28]))

    story.append(Paragraph(
        "* Receita estimada assumindo ticket medio R$ 500, taxa recuperacao 50%, "
        "split 15% sobre recuperado. Valores aproximados para referencia.",
        styles["BodySmall"],
    ))

    # ══════════════════════════════════════════════════════════════════
    # ENDERECOS E URLS
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. Enderecos e URLs da Plataforma", styles["SectionHeader"]))

    url_data = [
        ["Recurso", "URL / Endereco"],
        ["PagRecovery (producao)", "https://pagrecovery.com"],
        ["Shield Recovery (producao)", "https://shield-recovery.vercel.app"],
        ["PagRecovery Checkout", "https://pagrecovery.com/checkout"],
        ["Webhook PagNet", "https://pagrecovery.com/api/webhooks/pagouai"],
        ["Webhook Shield Gateway", "https://shield-recovery.vercel.app/api/webhooks/shield-gateway"],
        ["Webhook WhatsApp", "https://pagrecovery.com/api/webhooks/whatsapp"],
        ["Partner API (ingest)", "https://pagrecovery.com/api/partner/ingest"],
        ["Partner API (sellers)", "https://pagrecovery.com/api/partner/v1/sellers/{key}/..."],
        ["Worker Cron", "https://pagrecovery.com/api/worker/run"],
        ["Agent Cron", "https://pagrecovery.com/api/agent/orchestrate"],
        ["Health Check", "https://pagrecovery.com/api/health"],
        ["Repo PagRecovery", "github.com/gtdotwav/PAGRECOVERY (privado)"],
        ["Repo Shield", "github.com/gtdotwav/shieldrecovery (privado)"],
        ["Supabase (Recovery)", "nhuuvqxaydzlczhibeyj.supabase.co"],
        ["Supabase (Checkout)", "jiacgjvryxcduezrswap.supabase.co"],
    ]
    story.append(make_table(url_data[0], url_data[1:], col_widths=[W*0.32, W*0.68]))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════
    # PAGE 5 — STACK + RESUMO
    # ══════════════════════════════════════════════════════════════════
    story.append(Paragraph("9. Stack Tecnologico Completo", styles["SectionHeader"]))

    stack_data = [
        ["Camada", "Tecnologia", "Versao"],
        ["Framework", "Next.js (App Router) + React", "16 / 19"],
        ["Linguagem", "TypeScript", "5.9"],
        ["Banco de dados", "PostgreSQL via Supabase", "-"],
        ["Autenticacao", "HMAC-SHA256 custom (cookie sessions)", "-"],
        ["IA", "OpenAI GPT-4", "-"],
        ["WhatsApp", "Cloud API + Evolution API (Baileys)", "-"],
        ["Email", "SendGrid", "-"],
        ["Voz", "VAPI + ElevenLabs", "-"],
        ["Gateway cartao", "PagouAI", "-"],
        ["Gateway PIX", "PagNet Brasil", "-"],
        ["Hosting", "Vercel (Serverless + Edge + Cron)", "-"],
        ["CSS", "Tailwind CSS v4", "-"],
        ["Testes", "Vitest (52 testes de seguranca)", "-"],
    ]
    story.append(make_table(stack_data[0], stack_data[1:], col_widths=[W*0.22, W*0.52, W*0.26]))

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("10. Resumo Executivo", styles["SectionHeader"]))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))

    summary_final = (
        "<b>Custo fixo mensal:</b> US$ 20–45 (infra base)<br/><br/>"
        "<b>Custo variavel:</b> ~US$ 0.15–0.30 por lead recuperado (IA + mensageria)<br/><br/>"
        "<b>Receita:</b> Split sobre valor recuperado (configuravel por seller, tipicamente 10–20%)<br/><br/>"
        "<b>Margem:</b> Extremamente alta — custo de ~R$ 1,50/lead vs receita de ~R$ 75/lead (ticket R$ 500)<br/><br/>"
        "<b>Escalabilidade:</b> Custos crescem linear com volume; receita cresce proporcionalmente. "
        "A 1.000 leads/mes, custo total ~US$ 165 (~R$ 900) vs receita ~R$ 75.000.<br/><br/>"
        "<b>Break-even:</b> ~5 leads recuperados/mes cobrem toda infraestrutura."
    )
    story.append(Paragraph(summary_final, styles["Body"]))

    # ── Build ──
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return OUTPUT_PATH


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF gerado: {path}")
