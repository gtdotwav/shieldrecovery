#!/usr/bin/env python3
"""Generate Shield Recovery Project Presentation PDF."""
import os
os.environ["TMPDIR"] = "/dev/shm"
import tempfile
tempfile.tempdir = "/dev/shm"

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Frame, PageTemplate, BaseDocTemplate, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

W, H = A4

# Colors
DARK_BG = HexColor("#11131a")
ORANGE = HexColor("#f97316")
ORANGE_LIGHT = HexColor("#fdba74")
DARK_SURFACE = HexColor("#1e2130")
GRAY_700 = HexColor("#374151")
GRAY_500 = HexColor("#6b7280")
GRAY_300 = HexColor("#d1d5db")
GRAY_100 = HexColor("#f3f4f6")
WHITE = HexColor("#ffffff")
DARK_TEXT = HexColor("#111827")
SUCCESS = HexColor("#22c55e")
DANGER = HexColor("#ef4444")

OUTPUT = "/sessions/adoring-clever-rubin/mnt/shield recovery/Shield_Recovery_Projeto_Completo.pdf"

def draw_dark_page(c, doc):
    c.saveState()
    c.setFillColor(DARK_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.restoreState()

def draw_light_page(c, doc):
    c.saveState()
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Orange accent line at top
    c.setFillColor(ORANGE)
    c.rect(0, H - 4*mm, W, 4*mm, fill=1, stroke=0)
    c.restoreState()

# ── Styles ──
styles = getSampleStyleSheet()

s_cover_title = ParagraphStyle(
    "CoverTitle", parent=styles["Title"],
    fontSize=42, leading=48, textColor=WHITE,
    fontName="Helvetica-Bold", alignment=TA_LEFT,
    spaceAfter=12,
)
s_cover_sub = ParagraphStyle(
    "CoverSub", parent=styles["Normal"],
    fontSize=16, leading=22, textColor=HexColor("#a0aec0"),
    fontName="Helvetica", alignment=TA_LEFT,
)
s_section_title = ParagraphStyle(
    "SectionTitle", parent=styles["Heading1"],
    fontSize=28, leading=34, textColor=DARK_TEXT,
    fontName="Helvetica-Bold", spaceBefore=0, spaceAfter=6,
)
s_section_label = ParagraphStyle(
    "SectionLabel", parent=styles["Normal"],
    fontSize=10, leading=14, textColor=ORANGE,
    fontName="Helvetica-Bold",
    spaceAfter=4,
)
s_body = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontSize=11, leading=17, textColor=GRAY_700,
    fontName="Helvetica", alignment=TA_JUSTIFY,
    spaceAfter=8,
)
s_bullet = ParagraphStyle(
    "Bullet", parent=s_body,
    leftIndent=16, bulletIndent=6, spaceAfter=4,
    bulletFontName="Helvetica", bulletFontSize=11,
)
s_h2 = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontSize=16, leading=22, textColor=DARK_TEXT,
    fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6,
)
s_h3 = ParagraphStyle(
    "H3", parent=styles["Heading3"],
    fontSize=13, leading=18, textColor=GRAY_700,
    fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4,
)
s_caption = ParagraphStyle(
    "Caption", parent=styles["Normal"],
    fontSize=9, leading=13, textColor=GRAY_500,
    fontName="Helvetica-Oblique", alignment=TA_CENTER,
)
s_dark_title = ParagraphStyle(
    "DarkTitle", parent=styles["Title"],
    fontSize=32, leading=38, textColor=WHITE,
    fontName="Helvetica-Bold", alignment=TA_LEFT,
    spaceAfter=8,
)
s_dark_body = ParagraphStyle(
    "DarkBody", parent=styles["Normal"],
    fontSize=12, leading=18, textColor=HexColor("#cbd5e1"),
    fontName="Helvetica", alignment=TA_LEFT,
    spaceAfter=6,
)
s_dark_label = ParagraphStyle(
    "DarkLabel", parent=styles["Normal"],
    fontSize=10, leading=14, textColor=ORANGE,
    fontName="Helvetica-Bold", spaceAfter=4,
)
s_table_header = ParagraphStyle(
    "TableHeader", parent=styles["Normal"],
    fontSize=9, leading=12, textColor=WHITE,
    fontName="Helvetica-Bold",
)
s_table_cell = ParagraphStyle(
    "TableCell", parent=styles["Normal"],
    fontSize=9, leading=13, textColor=GRAY_700,
    fontName="Helvetica",
)

# ── Build Document ──
story = []

# ═══════════════════════════════════════════
# COVER PAGE (dark)
# ═══════════════════════════════════════════
# We'll draw the cover manually using a custom page
class CoverPage:
    pass

# Use canvas drawing for cover
def cover_page(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    # Dark background
    c.setFillColor(DARK_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Subtle orange glow
    c.setFillColor(HexColor("#1a0f05"))
    c.circle(W * 0.8, H * 0.75, 180, fill=1, stroke=0)

    # Orange accent bar
    c.setFillColor(ORANGE)
    c.rect(2*cm, H - 3*cm, 5*mm, 4*cm, fill=1, stroke=0)

    # Label
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2*cm + 12*mm, H - 3*cm + 2.8*cm, "SHIELD RECOVERY")

    # Title
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 40)
    y = H - 5.5*cm
    c.drawString(2*cm, y, "Apresentacao")
    c.drawString(2*cm, y - 50, "do Projeto")

    # Subtitle
    c.setFillColor(HexColor("#94a3b8"))
    c.setFont("Helvetica", 14)
    c.drawString(2*cm, y - 110, "Plataforma de recuperacao de pagamentos")
    c.drawString(2*cm, y - 130, "com IA, CRM e automacao multicanal.")

    # Bottom stats bar
    bar_y = 3*cm
    c.setFillColor(HexColor("#1e2130"))
    c.roundRect(2*cm, bar_y - 1*cm, W - 4*cm, 2.8*cm, 12, fill=1, stroke=0)

    stats = [
        ("STACK", "Next.js + Supabase + Vercel"),
        ("AI ENGINE", "OpenAI + Classificador"),
        ("CANAIS", "WhatsApp + Email + SMS"),
        ("STATUS", "MVP em producao"),
    ]
    stat_w = (W - 4*cm) / len(stats)
    for i, (label, value) in enumerate(stats):
        x = 2*cm + i * stat_w + 12
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x, bar_y + 1*cm, label)
        c.setFillColor(HexColor("#e2e8f0"))
        c.setFont("Helvetica", 9)
        c.drawString(x, bar_y + 0.3*cm, value)

    # Version
    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica", 9)
    c.drawString(2*cm, 1.2*cm, "Versao 1.0  |  Marco 2026  |  Documento interno")

    c.restoreState()

# ═══════════════════════════════════════════
# PAGE TEMPLATES
# ═══════════════════════════════════════════

left_m = 2*cm
right_m = 2*cm
top_m = 2.5*cm
bottom_m = 2.5*cm

frame_light = Frame(left_m, bottom_m, W - left_m - right_m, H - top_m - bottom_m, id="light")
frame_dark = Frame(left_m, bottom_m, W - left_m - right_m, H - top_m - bottom_m, id="dark")

light_template = PageTemplate(id="light", frames=[frame_light], onPage=draw_light_page)
dark_template = PageTemplate(id="dark", frames=[frame_dark], onPage=draw_dark_page)
cover_template = PageTemplate(id="cover", frames=[frame_light], onPage=cover_page)

doc = BaseDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=left_m, rightMargin=right_m,
    topMargin=top_m, bottomMargin=bottom_m,
)
doc.addPageTemplates([cover_template, light_template, dark_template])

# ── Cover ──
from reportlab.platypus.doctemplate import NextPageTemplate
from reportlab.platypus import ActionFlowable

story.append(Spacer(1, 1))  # trigger cover page
story.append(NextPageTemplate("light"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 2: O QUE E O SHIELD RECOVERY
# ═══════════════════════════════════════════
story.append(Paragraph("VISAO GERAL", s_section_label))
story.append(Paragraph("O que e o Shield Recovery", s_section_title))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "Shield Recovery e uma plataforma de <b>recuperacao inteligente de pagamentos</b> que transforma "
    "falhas de cobranca em oportunidades de receita. Quando um pagamento falha no gateway, a plataforma "
    "recebe o evento via webhook, classifica automaticamente a falha, aciona estrategias de recuperacao "
    "baseadas em IA e executa follow-ups multicanal via WhatsApp, email e SMS.",
    s_body
))
story.append(Paragraph(
    "O objetivo central e <b>eliminar a receita perdida por falhas tecnicas ou operacionais</b> nos "
    "pagamentos, oferecendo uma operacao assistida por inteligencia artificial que gerencia todo o ciclo "
    "de vida do recovery: desde a deteccao da falha ate a confirmacao do pagamento recuperado.",
    s_body
))
story.append(Spacer(1, 8))

# Key value props
story.append(Paragraph("Proposta de valor", s_h2))
props = [
    ["<b>Automatizacao end-to-end</b>", "Da falha de pagamento ate a recuperacao, sem intervencao manual obrigatoria."],
    ["<b>IA como motor de decisao</b>", "Classificacao de leads, recomendacao de estrategia e geracao de mensagens por contexto."],
    ["<b>CRM integrado</b>", "Leads organizados em pipeline com historico completo de tratativas."],
    ["<b>Multicanal nativo</b>", "WhatsApp Cloud API, email via SendGrid e SMS em uma unica plataforma."],
    ["<b>Real-time via webhooks</b>", "Integracao direta com gateways de pagamento para reacao imediata."],
]
for title, desc in props:
    story.append(Paragraph(f"{title} &mdash; {desc}", s_bullet, bulletText="\u2022"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 3: PROBLEMA QUE RESOLVE
# ═══════════════════════════════════════════
story.append(Paragraph("PROBLEMA", s_section_label))
story.append(Paragraph("A dor que o Shield Recovery resolve", s_section_title))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "Empresas digitais perdem entre <b>5% e 15% da receita recorrente</b> com falhas de pagamento: "
    "cartoes recusados, saldo insuficiente, cartoes expirados, timeouts de gateway. Na maioria dos "
    "casos, nao existe um processo estruturado de recuperacao. O cliente nem sabe que o pagamento falhou.",
    s_body
))
story.append(Spacer(1, 6))

# Before/After table
table_data = [
    [Paragraph("<b>ANTES (sem Shield)</b>", s_table_header),
     Paragraph("<b>DEPOIS (com Shield)</b>", s_table_header)],
    [Paragraph("Falha detectada dias depois", s_table_cell),
     Paragraph("Falha detectada em segundos via webhook", s_table_cell)],
    [Paragraph("Operador procura manualmente no CRM", s_table_cell),
     Paragraph("Lead criado automaticamente com contexto", s_table_cell)],
    [Paragraph("Mensagem generica enviada por email", s_table_cell),
     Paragraph("Mensagem personalizada por IA via WhatsApp", s_table_cell)],
    [Paragraph("Sem follow-up sistematico", s_table_cell),
     Paragraph("Cadencia automatica com escalacao", s_table_cell)],
    [Paragraph("Sem visibilidade de metricas", s_table_cell),
     Paragraph("Dashboard com taxa de recuperacao em tempo real", s_table_cell)],
    [Paragraph("Receita perdida silenciosamente", s_table_cell),
     Paragraph("Cada centavo rastreado e recuperado", s_table_cell)],
]

t = Table(table_data, colWidths=[(W - 4*cm) / 2] * 2)
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, 0), DANGER),
    ("BACKGROUND", (1, 0), (1, 0), SUCCESS),
    ("BACKGROUND", (0, 1), (0, -1), HexColor("#fef2f2")),
    ("BACKGROUND", (1, 1), (1, -1), HexColor("#f0fdf4")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("GRID", (0, 0), (-1, -1), 0.5, GRAY_300),
    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
]))
story.append(t)
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 4: ARQUITETURA TECNICA
# ═══════════════════════════════════════════
story.append(Paragraph("ARQUITETURA", s_section_label))
story.append(Paragraph("Stack e arquitetura do sistema", s_section_title))
story.append(Spacer(1, 6))

story.append(Paragraph("Fluxo principal", s_h2))
flow_data = [
    [Paragraph("<b>Etapa</b>", s_table_header),
     Paragraph("<b>Componente</b>", s_table_header),
     Paragraph("<b>Funcao</b>", s_table_header)],
    [Paragraph("1", s_table_cell), Paragraph("Gateway Shield", s_table_cell),
     Paragraph("Envia evento de falha via webhook", s_table_cell)],
    [Paragraph("2", s_table_cell), Paragraph("Webhook Receiver", s_table_cell),
     Paragraph("Recebe, valida assinatura e persiste evento", s_table_cell)],
    [Paragraph("3", s_table_cell), Paragraph("Event Normalizer", s_table_cell),
     Paragraph("Padroniza payload para contrato interno", s_table_cell)],
    [Paragraph("4", s_table_cell), Paragraph("Lead Engine", s_table_cell),
     Paragraph("Cria lead no CRM com dados do cliente", s_table_cell)],
    [Paragraph("5", s_table_cell), Paragraph("AI Classifier", s_table_cell),
     Paragraph("Classifica a falha e calcula score de recuperacao", s_table_cell)],
    [Paragraph("6", s_table_cell), Paragraph("Strategy Engine", s_table_cell),
     Paragraph("Seleciona a melhor estrategia de abordagem", s_table_cell)],
    [Paragraph("7", s_table_cell), Paragraph("Message Generator", s_table_cell),
     Paragraph("Gera mensagem personalizada por canal", s_table_cell)],
    [Paragraph("8", s_table_cell), Paragraph("Recovery Automation", s_table_cell),
     Paragraph("Agenda e executa a cadencia de follow-up", s_table_cell)],
    [Paragraph("9", s_table_cell), Paragraph("Messaging Service", s_table_cell),
     Paragraph("Envia via WhatsApp/Email/SMS", s_table_cell)],
    [Paragraph("10", s_table_cell), Paragraph("Analytics", s_table_cell),
     Paragraph("Atualiza metricas de recuperacao em tempo real", s_table_cell)],
]

t2 = Table(flow_data, colWidths=[1.2*cm, 4*cm, (W - 4*cm) - 5.2*cm])
t2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
    ("BACKGROUND", (0, 1), (-1, -1), GRAY_100),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, GRAY_300),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
]))
story.append(t2)

story.append(Spacer(1, 12))
story.append(Paragraph("Stack tecnologico", s_h2))
stack_items = [
    "<b>Frontend:</b> Next.js 14+ (App Router), React, Tailwind CSS, shadcn/ui",
    "<b>Backend:</b> Next.js API Routes + Server Actions, TypeScript",
    "<b>Banco de dados:</b> Supabase (Postgres) com fallback local JSON",
    "<b>IA:</b> OpenAI API para classificacao, geracao de mensagens e recomendacoes",
    "<b>Mensageria:</b> WhatsApp Cloud API, SendGrid (email)",
    "<b>Deploy:</b> Vercel (edge-optimized)",
    "<b>Filas:</b> Sistema de queue jobs interno (caminho para BullMQ/Redis)",
    "<b>Autenticacao:</b> Sistema proprio com sessoes e roles (admin/seller)",
]
for item in stack_items:
    story.append(Paragraph(item, s_bullet, bulletText="\u2022"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 5: MODULOS DO PRODUTO
# ═══════════════════════════════════════════
story.append(Paragraph("PRODUTO", s_section_label))
story.append(Paragraph("Modulos e areas da plataforma", s_section_title))
story.append(Spacer(1, 6))

modules = [
    ("/ (Home)", "Pagina institucional e de posicionamento",
     "Apresenta a tese do produto, metricas reais do sistema (eventos recebidos, recuperacoes ativas, carteira) e links para as areas operacionais."),
    ("/dashboard (Recuperacao)", "Painel operacional de prioridades",
     "Fila do que exige atencao agora: metricas de recuperacao, leads prioritarios, gargalos operacionais. Leitura direta do banco de dados real."),
    ("/leads (CRM)", "Gestao de carteira por pipeline",
     "Leads organizados em funil: NEW_RECOVERY > CONTACTING > WAITING_CUSTOMER > RECOVERED > LOST. Cards com nome, valor, canal, agente e proxima acao."),
    ("/inbox (Conversas)", "Centro de atendimento multicanal",
     "Fila de conversas, thread de mensagens e contexto do lead. Permite resposta humana e sugestao de IA. Status de envio/entrega/leitura."),
    ("/connect (Integracoes)", "Hub de configuracao de canais",
     "Status de cada integracao (Gateway, WhatsApp, Email, CRM, IA), credenciais, validacao e testes de conexao."),
    ("/calendar (Calendario)", "Visao temporal da operacao",
     "Movimento diario com recoveries, leads, automacoes e mensagens. Board operacional com notas por lane."),
    ("/ai (Inteligencia)", "Centro de comando da IA",
     "Classificacoes de leads, estrategias ativas, performance por estrategia, feed de atividades da IA e geracao de mensagens."),
    ("/admin (Administracao)", "Controle de vendedores e workers",
     "Gestao de sellers, modo de autonomia (assistido/supervisionado/autonomo), filas de jobs e monitoramento do worker."),
]

for route, subtitle, desc in modules:
    story.append(Paragraph(f"<b>{route}</b>", s_h3))
    story.append(Paragraph(f"<i>{subtitle}</i>", ParagraphStyle("sub", parent=s_body, textColor=ORANGE, fontSize=10)))
    story.append(Paragraph(desc, s_body))

story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 6: MOTOR DE IA
# ═══════════════════════════════════════════
story.append(NextPageTemplate("dark"))
story.append(Paragraph("INTELIGENCIA ARTIFICIAL", s_dark_label))
story.append(Paragraph("Motor de IA do Shield Recovery", s_dark_title))
story.append(Spacer(1, 8))

story.append(Paragraph(
    "A IA nao e uma camada cosmetica. E o nucleo de decisao do produto. "
    "Cada lead que entra passa por um pipeline de inteligencia que classifica, "
    "recomenda e executa a melhor abordagem de recuperacao.",
    s_dark_body
))
story.append(Spacer(1, 10))

ai_components = [
    ("Recovery Classifier", "Analisa o contexto do lead (tipo de falha, valor, metodo de pagamento, tempo desde a falha) e gera um score de 0 a 100 que determina a prioridade de tratamento."),
    ("Strategy Engine", "5 estrategias pre-configuradas: Cartao recusado, Saldo insuficiente, Cartao expirado, Timeout do gateway, Renovacao de assinatura. Cada uma com cadencia multi-step e multi-canal."),
    ("Message Generator", "Gera mensagens personalizadas considerando: nome do cliente, produto, valor, motivo da falha, canal de envio e numero da tentativa. Usa OpenAI quando configurado, fallback para templates."),
    ("AI Orchestrator", "Camada central que agrega classificacoes, metricas, timeline de follow-up e performance de estrategias. Alimenta o dashboard de IA com dados em tempo real."),
]

for title, desc in ai_components:
    story.append(Paragraph(f"<b>{title}</b>", ParagraphStyle("ait", parent=s_dark_body, textColor=ORANGE_LIGHT, fontSize=13, fontName="Helvetica-Bold")))
    story.append(Paragraph(desc, s_dark_body))
    story.append(Spacer(1, 6))

story.append(NextPageTemplate("light"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 7: ESTRATEGIAS DE RECUPERACAO
# ═══════════════════════════════════════════
story.append(Paragraph("ESTRATEGIAS", s_section_label))
story.append(Paragraph("Playbooks de recuperacao automatica", s_section_title))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Cada tipo de falha de pagamento aciona uma estrategia diferente. As estrategias sao compostas "
    "por steps sequenciais com canais, delays e condicoes de disparo.",
    s_body
))
story.append(Spacer(1, 6))

strategies = [
    ("Cartao Recusado", "5 steps", "WhatsApp (5min) > WhatsApp reminder (2h) > Email alternativo (6h) > CRM update > Close",
     "card_declined, generic_decline, insufficient_funds, refused"),
    ("Saldo Insuficiente", "3 steps", "WhatsApp empatico + Pix (10min) > Follow-up Pix (4h) > Email parcelamento (24h)",
     "insufficient_funds"),
    ("Cartao Expirado", "3 steps", "WhatsApp aviso (5min) > Email instrucoes (1h) > WhatsApp final (24h)",
     "expired_card"),
    ("Timeout Gateway", "3 steps", "WhatsApp tecnico (3min) > Auto-retry link (3min) > WhatsApp link (5min)",
     "gateway_timeout, processing_error"),
    ("Renovacao Assinatura", "3 steps", "WhatsApp renovacao (15min) > Email detalhado (2h) > Alerta urgente (3d)",
     "subscription renewal failures"),
]

strat_data = [
    [Paragraph("<b>Estrategia</b>", s_table_header),
     Paragraph("<b>Steps</b>", s_table_header),
     Paragraph("<b>Cadencia</b>", s_table_header),
     Paragraph("<b>Triggers</b>", s_table_header)],
]
for name, steps, cadence, triggers in strategies:
    strat_data.append([
        Paragraph(f"<b>{name}</b>", s_table_cell),
        Paragraph(steps, s_table_cell),
        Paragraph(cadence, s_table_cell),
        Paragraph(f"<i>{triggers}</i>", ParagraphStyle("trig", parent=s_table_cell, fontSize=8, textColor=GRAY_500)),
    ])

t3 = Table(strat_data, colWidths=[3*cm, 1.8*cm, 6.5*cm, (W - 4*cm) - 11.3*cm])
t3.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, GRAY_300),
]))
story.append(t3)
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 8: MODELO DE DADOS
# ═══════════════════════════════════════════
story.append(Paragraph("DADOS", s_section_label))
story.append(Paragraph("Modelo de dados e entidades", s_section_title))
story.append(Spacer(1, 6))

story.append(Paragraph("Entidades operacionais", s_h2))

entities = [
    ("payments", "Pagamentos recebidos do gateway com status, valor, metodo e falha."),
    ("customers", "Dados do cliente: nome, email, telefone, documento."),
    ("recovery_leads", "Lead de recuperacao com pipeline status, agente, valor e produto."),
    ("conversations", "Conversas por lead com canal, status e agente responsavel."),
    ("messages", "Mensagens individuais com direcao, status de entrega e metadata."),
    ("queue_jobs", "Jobs agendados para automacao (recovery, retry, notification)."),
    ("webhook_events", "Registro de todos os eventos recebidos para auditoria."),
    ("payment_attempts", "Tentativas de retry com link de pagamento."),
    ("agents", "Operadores da plataforma."),
    ("calendar_notes", "Anotacoes operacionais por data e lane."),
    ("seller_admin_controls", "Configuracoes por vendedor (autonomia, limites, metas)."),
    ("seller_users", "Usuarios vendedores com autenticacao propria."),
    ("connection_settings", "Credenciais e configs de todas as integracoes."),
    ("system_logs", "Log estruturado de eventos do sistema."),
]

ent_data = [[Paragraph("<b>Entidade</b>", s_table_header), Paragraph("<b>Descricao</b>", s_table_header)]]
for name, desc in entities:
    ent_data.append([Paragraph(f"<b>{name}</b>", s_table_cell), Paragraph(desc, s_table_cell)])

t4 = Table(ent_data, colWidths=[4.5*cm, (W - 4*cm) - 4.5*cm])
t4.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, GRAY_300),
]))
story.append(t4)
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 9: ESTADO ATUAL E MATURIDADE
# ═══════════════════════════════════════════
story.append(Paragraph("STATUS", s_section_label))
story.append(Paragraph("Estado atual e maturidade do projeto", s_section_title))
story.append(Spacer(1, 6))

story.append(Paragraph("O que ja esta funcional", s_h2))
done_items = [
    "Webhook receiver com validacao de assinatura HMAC",
    "Event Normalizer para diferentes formatos de gateway",
    "Pipeline de leads com 5 estagios (NEW > CONTACTING > WAITING > RECOVERED > LOST)",
    "CRM com listagem e detalhamento de leads",
    "Inbox de conversas com mensagens bidirecionais",
    "5 estrategias de recuperacao configuradas",
    "AI Classifier com score de recuperabilidade",
    "Message Generator com templates e fallback OpenAI",
    "Dashboard com metricas operacionais",
    "Sistema de autenticacao com roles (admin/seller)",
    "Calendario operacional com notas e atividades",
    "Admin panel para gestao de vendedores",
    "Configuracao de conexoes (WhatsApp, Email, Gateway, IA)",
    "Worker system para processamento de filas",
    "Persistencia com Supabase e fallback local",
]
for item in done_items:
    story.append(Paragraph(item, s_bullet, bulletText="\u2713"))

story.append(Spacer(1, 10))
story.append(Paragraph("O que precisa de consolidacao", s_h2))
todo_items = [
    "Padronizar camada unica de persistencia (eliminar dualidade Supabase/Prisma)",
    "Substituir dados mockados por estados vazios honestos nas telas internas",
    "Conectar worker real com BullMQ/Redis para execucao de automacoes",
    "Implementar inbox com status real de envio/entrega/leitura",
    "Criar timeline completa por lead com historico de tratativas",
    "Habilitar playbooks editaveis via UI (hoje sao hardcoded)",
    "Conectar WhatsApp Cloud API em producao",
    "Reduzir peso visual da interface (menos glow, mais hierarquia)",
]
for item in todo_items:
    story.append(Paragraph(item, s_bullet, bulletText="\u2022"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 10: ROADMAP
# ═══════════════════════════════════════════
story.append(Paragraph("ROADMAP", s_section_label))
story.append(Paragraph("Plano de evolucao por fases", s_section_title))
story.append(Spacer(1, 6))

phases = [
    ("Fase 0 - Consolidacao tecnica",
     "Escolher banco oficial, remover codigo morto, alinhar envs, parar de mostrar dado fake em tela interna.",
     "Decisao de persistencia, storage simplificado, health endpoint real"),
    ("Fase 1 - Dados reais ponta a ponta",
     "Toda area interna deve ler apenas dado real ou estado vazio.",
     "Dashboard sem metricas inventadas, leads sem placeholders, connect com status real"),
    ("Fase 2 - Integracoes reais",
     "Receber e usar dados do gateway, conectar canais reais.",
     "Gateway definitivo, WhatsApp Cloud API, email provider, persistencia de conexoes"),
    ("Fase 3 - Inbox e tratativa",
     "Permitir atendimento real dentro do produto.",
     "Inbox completa, composer de mensagem, status de envio/leitura, historico por conversa"),
    ("Fase 4 - CRM e IA operacionais",
     "Transformar /leads em area de execucao comercial assistida.",
     "Lead detail, timeline, AI summary, recomendacao de funil, playbooks reais"),
    ("Fase 5 - Fila real e automacao",
     "Automacoes sairem do papel.",
     "BullMQ, Redis, workers, cadencias reais, alertas e retries"),
]

for title, desc, deliverables in phases:
    story.append(Paragraph(f"<b>{title}</b>", s_h3))
    story.append(Paragraph(desc, s_body))
    story.append(Paragraph(f"<b>Entregas:</b> {deliverables}", ParagraphStyle("del", parent=s_body, textColor=ORANGE, fontSize=10)))
    story.append(Spacer(1, 4))

story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 11: DIFERENCIAIS E VISAO
# ═══════════════════════════════════════════
story.append(NextPageTemplate("dark"))
story.append(Paragraph("VISAO", s_dark_label))
story.append(Paragraph("Diferenciais e visao de longo prazo", s_dark_title))
story.append(Spacer(1, 10))

diffs = [
    ("Nao e um CRM generico", "E um CRM especializado em recovery, onde cada feature existe para recuperar receita."),
    ("IA como copiloto, nao como enfeite", "A IA classifica, recomenda e gera. Deixa rastro do que fez e por que fez. O operador decide se executa."),
    ("Ecossistema fechado", "Webhook, CRM, inbox, automacao e analytics vivem na mesma plataforma. Nao precisa de 5 ferramentas."),
    ("Pensado para escala", "Supabase + Vercel + filas permitem ir de 10 a 10.000 leads sem reescrever."),
    ("Autonomia configuravel", "Admin controla se o seller opera em modo assistido, supervisionado ou autonomo."),
]

for title, desc in diffs:
    story.append(Paragraph(f"<b>{title}</b>", ParagraphStyle("dt", parent=s_dark_body, textColor=ORANGE_LIGHT, fontSize=14, fontName="Helvetica-Bold")))
    story.append(Paragraph(desc, s_dark_body))
    story.append(Spacer(1, 10))

story.append(NextPageTemplate("light"))
story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 12: METRICAS E KPIs
# ═══════════════════════════════════════════
story.append(Paragraph("METRICAS", s_section_label))
story.append(Paragraph("KPIs e metricas do sistema", s_section_title))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "O Shield Recovery rastreia metricas em tempo real que permitem medir a eficacia "
    "da operacao de recuperacao:",
    s_body
))
story.append(Spacer(1, 6))

kpi_data = [
    [Paragraph("<b>KPI</b>", s_table_header),
     Paragraph("<b>Descricao</b>", s_table_header),
     Paragraph("<b>Fonte</b>", s_table_header)],
    [Paragraph("Taxa de recuperacao", s_table_cell),
     Paragraph("% de pagamentos falhos que foram recuperados", s_table_cell),
     Paragraph("RecoveryAnalytics", s_table_cell)],
    [Paragraph("Receita recuperada", s_table_cell),
     Paragraph("Valor total em R$ dos pagamentos recuperados", s_table_cell),
     Paragraph("RecoveryAnalytics", s_table_cell)],
    [Paragraph("Tempo medio de recovery", s_table_cell),
     Paragraph("Horas entre falha e recuperacao confirmada", s_table_cell),
     Paragraph("RecoveryAnalytics", s_table_cell)],
    [Paragraph("Recoveries ativas", s_table_cell),
     Paragraph("Leads em tratativa no momento", s_table_cell),
     Paragraph("Lead pipeline", s_table_cell)],
    [Paragraph("Conversas ativas", s_table_cell),
     Paragraph("Threads abertas com interacao recente", s_table_cell),
     Paragraph("Inbox", s_table_cell)],
    [Paragraph("Msgs geradas/dia", s_table_cell),
     Paragraph("Mensagens criadas pela IA nas ultimas 24h", s_table_cell),
     Paragraph("AI Orchestrator", s_table_cell)],
    [Paragraph("Performance por estrategia", s_table_cell),
     Paragraph("Taxa de sucesso e tempo medio por playbook", s_table_cell),
     Paragraph("Strategy Engine", s_table_cell)],
]

t5 = Table(kpi_data, colWidths=[4*cm, 7*cm, (W - 4*cm) - 11*cm])
t5.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_100]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, GRAY_300),
]))
story.append(t5)

story.append(Spacer(1, 14))
story.append(Paragraph("Metricas por vendedor (Admin Panel)", s_h2))
admin_metrics = [
    "Leads ativos por seller",
    "Leads aguardando cliente",
    "Contagem e valor de recuperacoes",
    "Conversas abertas e nao lidas",
    "Taxa de recuperacao da plataforma vs taxa real",
    "Ultima atividade do seller",
]
for m in admin_metrics:
    story.append(Paragraph(m, s_bullet, bulletText="\u2022"))

story.append(PageBreak())

# ═══════════════════════════════════════════
# SLIDE 13: CONCLUSAO
# ═══════════════════════════════════════════
story.append(NextPageTemplate("dark"))
story.append(Paragraph("CONCLUSAO", s_dark_label))
story.append(Paragraph("Shield Recovery e um produto real", s_dark_title))
story.append(Spacer(1, 12))

story.append(Paragraph(
    "O projeto ja ultrapassou a fase de conceito. Existe backend funcional, "
    "pipeline de leads, motor de IA, inbox de conversas, dashboard operacional "
    "e sistema de autenticacao. A base arquitetural suporta escala.",
    s_dark_body
))
story.append(Spacer(1, 8))

story.append(Paragraph(
    "A proxima fase nao e adicionar mais telas. E consolidar, limpar a base "
    "e conectar as integracoes reais. A industrializacao do produto.",
    s_dark_body
))
story.append(Spacer(1, 12))

conclusions = [
    "Menos mock, mais dado real",
    "Menos duplicidade, mais consistencia",
    "Menos narrativa, mais operacao",
    "Menos efeito visual, mais hierarquia",
    "Menos ferramentas externas, mais ecossistema proprio",
]
for c in conclusions:
    story.append(Paragraph(
        f"<b>{c}</b>",
        ParagraphStyle("conc", parent=s_dark_body, textColor=ORANGE_LIGHT, fontSize=14, fontName="Helvetica-Bold", spaceAfter=8)
    ))

story.append(Spacer(1, 20))
story.append(Paragraph(
    "Shield Recovery &mdash; A falha entra. A operacao responde.",
    ParagraphStyle("final", parent=s_dark_body, textColor=WHITE, fontSize=18, fontName="Helvetica-Bold", alignment=TA_CENTER)
))

# ── Build ──
doc.build(story)
print(f"PDF generated: {OUTPUT}")
