# -*- coding: utf-8 -*-
"""
Kingdoms Touch Services - Field Reports
Branded user manual generator (ES + EN).

Outputs ../public/docs/manual-es.pdf and ../public/docs/manual-en.pdf
"""
import os

from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, KeepTogether,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BRAND = os.path.join(ROOT, "public", "brand")
OUT = os.path.join(ROOT, "public", "docs")
os.makedirs(OUT, exist_ok=True)

# ── Brand tokens ───────────────────────────────────────────────
FOREST = HexColor("#1F3D2B")
FOREST_DEEP = HexColor("#15291D")
GOLD = HexColor("#C4984C")
GOLD_DEEP = HexColor("#8A6420")
GOLD_TINT = HexColor("#F3EAD7")
IVORY = HexColor("#F7F3E8")
CHARCOAL = HexColor("#1A1A1A")
MUTED = HexColor("#6B6358")
LINE = HexColor("#DCD4C2")
WHITE = HexColor("#FFFFFF")
SAGE = HexColor("#8FA58B")
DANGER = HexColor("#A04A2E")

F = os.path.join(HERE, "fonts")
pdfmetrics.registerFont(TTFont("Cinzel", os.path.join(F, "Cinzel-600.ttf")))
pdfmetrics.registerFont(TTFont("Cinzel-Bold", os.path.join(F, "Cinzel-700.ttf")))
pdfmetrics.registerFont(TTFont("Manrope", os.path.join(F, "Manrope-400.ttf")))
pdfmetrics.registerFont(TTFont("Manrope-Semi", os.path.join(F, "Manrope-600.ttf")))
pdfmetrics.registerFont(TTFont("Manrope-Bold", os.path.join(F, "Manrope-800.ttf")))

PAGE_W, PAGE_H = letter
MARGIN = 0.85 * inch

# ── Styles ─────────────────────────────────────────────────────
body = ParagraphStyle(
    "body", fontName="Manrope", fontSize=10.5, leading=15.5,
    textColor=CHARCOAL, spaceAfter=6,
)
body_muted = ParagraphStyle("body_muted", parent=body, textColor=MUTED)
step_text = ParagraphStyle("step_text", parent=body, spaceAfter=0, leading=15)
section_eyebrow = ParagraphStyle(
    "section_eyebrow", fontName="Manrope-Bold", fontSize=8.5,
    textColor=GOLD_DEEP, leading=12, spaceAfter=2,
)
section_title = ParagraphStyle(
    "section_title", fontName="Cinzel", fontSize=19, leading=24,
    textColor=FOREST, spaceAfter=2,
)
sub_h = ParagraphStyle(
    "sub_h", fontName="Manrope-Bold", fontSize=11.5, leading=16,
    textColor=FOREST, spaceBefore=10, spaceAfter=4,
)
tip_style = ParagraphStyle(
    "tip", fontName="Manrope", fontSize=9.5, leading=14, textColor=CHARCOAL,
)
chip_style = ParagraphStyle(
    "chip", fontName="Manrope-Bold", fontSize=8, textColor=WHITE,
    alignment=TA_CENTER, leading=10,
)


def letterspace(s):
    return (" ".join(list(s))).upper()


def num_chip(n):
    t = Table(
        [[Paragraph(str(n), ParagraphStyle(
            "n", fontName="Manrope-Bold", fontSize=10, textColor=WHITE,
            alignment=TA_CENTER, leading=12))]],
        colWidths=[0.26 * inch], rowHeights=[0.26 * inch],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GOLD),
        ("ROUNDEDCORNERS", [5, 5, 5, 5]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def steps_table(steps):
    rows = []
    for i, s in enumerate(steps, 1):
        rows.append([num_chip(i), Paragraph(s, step_text)])
    t = Table(rows, colWidths=[0.42 * inch, PAGE_W - 2 * MARGIN - 0.42 * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, -1), 6),
        ("LEFTPADDING", (1, 0), (1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def bullets(items):
    flow = []
    for s in items:
        flow.append(Paragraph(
            f'<font color="#C4984C">&#9632;</font>&nbsp;&nbsp;{s}', body))
    return flow


def tip_box(label, text):
    p = Paragraph(
        f'<font name="Manrope-Bold" color="#8A6420">{label}</font>'
        f'<br/>{text}', tip_style)
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GOLD_TINT),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def role_chip(label, color):
    w = max(0.9, 0.13 * len(label)) * inch
    t = Table([[Paragraph(letterspace(label), chip_style)]],
              colWidths=[w], rowHeights=[0.22 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    wrap = Table([[t]], colWidths=[PAGE_W - 2 * MARGIN])
    wrap.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ]))
    return wrap


def section(eyebrow, title, chip=None, chip_color=GOLD):
    flow = [Spacer(1, 18)]
    if chip:
        flow.append(role_chip(chip, chip_color))
    flow.append(Paragraph(letterspace(eyebrow), section_eyebrow))
    flow.append(Paragraph(title, section_title))
    rule = Table([[""]], colWidths=[1.1 * inch], rowHeights=[2.2])
    rule.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    wrap = Table([[rule]], colWidths=[PAGE_W - 2 * MARGIN])
    wrap.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    flow.append(wrap)
    return flow


# ── Page decorations ───────────────────────────────────────────

def make_cover(lang):
    def cover(canv, doc):
        canv.saveState()
        canv.setFillColor(IVORY)
        canv.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # bottom forest band
        canv.setFillColor(FOREST)
        canv.rect(0, 0, PAGE_W, 1.5 * inch, stroke=0, fill=1)
        canv.setFillColor(GOLD)
        canv.rect(0, 1.5 * inch, PAGE_W, 0.035 * inch, stroke=0, fill=1)
        # logo
        logo = os.path.join(BRAND, "logo-full-transparent.png")
        lw = 2.9 * inch
        lh = lw * 1538 / 1600
        canv.drawImage(logo, (PAGE_W - lw) / 2, PAGE_H - 1.6 * inch - lh,
                       width=lw, height=lh, mask="auto")
        y = PAGE_H - 1.95 * inch - lh
        canv.setFillColor(GOLD_DEEP)
        canv.setFont("Manrope-Bold", 10)
        sub = "FIELD REPORTS" if lang == "en" else "REPORTES DE CAMPO"
        canv.drawCentredString(PAGE_W / 2, y, " ".join(list(sub)))
        title = "User Manual" if lang == "en" else "Manual de Uso"
        canv.setFillColor(FOREST)
        canv.setFont("Cinzel-Bold", 34)
        canv.drawCentredString(PAGE_W / 2, y - 0.62 * inch, title)
        # gold hairline
        canv.setStrokeColor(GOLD)
        canv.setLineWidth(1.2)
        canv.line(PAGE_W / 2 - 0.55 * inch, y - 0.92 * inch,
                  PAGE_W / 2 + 0.55 * inch, y - 0.92 * inch)
        tag = ("For employees, supervisors and administrators"
               if lang == "en"
               else "Para empleados, supervisores y administradores")
        canv.setFillColor(MUTED)
        canv.setFont("Manrope", 11)
        canv.drawCentredString(PAGE_W / 2, y - 1.28 * inch, tag)
        # band text
        canv.setFillColor(WHITE)
        canv.setFont("Manrope-Bold", 9)
        canv.drawCentredString(PAGE_W / 2, 0.92 * inch,
                               "KINGDOMS TOUCH SERVICES")
        canv.setFillColor(HexColor("#E0C079"))
        canv.setFont("Manrope", 8.5)
        app = "kingdom-touch.vercel.app"
        ver = ("Version 2.4 - 2026" if lang == "en"
               else "Versión 2.4 - 2026")
        canv.drawCentredString(PAGE_W / 2, 0.70 * inch, f"{app}  |  {ver}")
        canv.restoreState()
    return cover


def make_decor(lang):
    label = ("USER MANUAL" if lang == "en" else "MANUAL DE USO")

    def decor(canv, doc):
        canv.saveState()
        # header
        mark = os.path.join(BRAND, "mark-transparent.png")
        mh = 0.30 * inch
        mw = mh * 565 / 610
        canv.drawImage(mark, MARGIN, PAGE_H - 0.62 * inch, width=mw,
                       height=mh, mask="auto")
        canv.setFillColor(GOLD_DEEP)
        canv.setFont("Manrope-Bold", 7)
        canv.drawString(MARGIN + mw + 8, PAGE_H - 0.50 * inch,
                        " ".join(list("KINGDOMS TOUCH SERVICES")))
        canv.setFillColor(MUTED)
        canv.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.50 * inch,
                             " ".join(list(label)))
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.7)
        canv.line(MARGIN, PAGE_H - 0.70 * inch, PAGE_W - MARGIN,
                  PAGE_H - 0.70 * inch)
        # footer
        canv.setStrokeColor(LINE)
        canv.line(MARGIN, 0.55 * inch, PAGE_W - MARGIN, 0.55 * inch)
        canv.setFillColor(MUTED)
        canv.setFont("Manrope", 8)
        canv.drawCentredString(PAGE_W / 2, 0.38 * inch, str(canv.getPageNumber()))
        canv.restoreState()
    return decor


# ── Content ────────────────────────────────────────────────────

def t(lang, es, en):
    return es if lang == "es" else en


def build_story(lang):
    s = []
    L = lambda es, en: t(lang, es, en)  # noqa: E731

    # 1 · Welcome / install
    s += section(L("Sección 1", "Section 1"),
                 L("Bienvenido", "Welcome"))
    s.append(Paragraph(L(
        "Field Reports es la aplicación de Kingdoms Touch Services para "
        "documentar el trabajo de campo: cada trabajo se registra con fotos, "
        "ubicación GPS y notas, y el supervisor lo revisa y aprueba. "
        "Funciona en el teléfono como una app y también sin señal: lo que "
        "captures se guarda y se envía solo cuando vuelve la conexión.",
        "Field Reports is the Kingdoms Touch Services app for documenting "
        "field work: every job is recorded with photos, GPS location and "
        "notes, and a supervisor reviews and approves it. It works on your "
        "phone like an app and even without signal: whatever you capture is "
        "saved and sent automatically when the connection returns."), body))
    s.append(Paragraph(L("Instalar la app en tu teléfono",
                         "Install the app on your phone"), sub_h))
    s.append(steps_table([
        L("Abre <font name='Manrope-Bold'>kingdom-touch.vercel.app</font> "
          "en el navegador de tu teléfono.",
          "Open <font name='Manrope-Bold'>kingdom-touch.vercel.app</font> "
          "in your phone's browser."),
        L("<font name='Manrope-Bold'>Android (Chrome):</font> toca el botón "
          "«Instalar app» en la pantalla de inicio de sesión y confirma.",
          "<font name='Manrope-Bold'>Android (Chrome):</font> tap the "
          "“Install app” button on the sign-in screen and confirm."),
        L("<font name='Manrope-Bold'>iPhone (Safari):</font> toca "
          "<font name='Manrope-Bold'>Compartir</font> (cuadro con flecha) y "
          "luego <font name='Manrope-Bold'>«Agregar a pantalla de "
          "inicio»</font>.",
          "<font name='Manrope-Bold'>iPhone (Safari):</font> tap "
          "<font name='Manrope-Bold'>Share</font> (square with arrow), then "
          "<font name='Manrope-Bold'>“Add to Home Screen”</font>."),
        L("La app queda en tu pantalla de inicio con el ícono de la corona.",
          "The app stays on your home screen with the crown icon."),
    ]))
    s.append(Spacer(1, 8))
    s.append(tip_box(L("Idioma", "Language"), L(
        "La app está en español e inglés. Detecta el idioma de tu teléfono "
        "automáticamente y puedes cambiarlo en Perfil &gt; Idioma.",
        "The app is available in English and Spanish. It detects your "
        "phone's language automatically and you can change it in "
        "Profile &gt; Language.")))

    # 2 · Sign in
    s += section(L("Sección 2", "Section 2"),
                 L("Cómo iniciar sesión", "How to sign in"))
    s.append(Paragraph(L("Empleados de campo (PIN)",
                         "Field employees (PIN)"), sub_h))
    s.append(steps_table([
        L("La primera vez, escribe tu <font name='Manrope-Bold'>nombre y "
          "apellido</font> y toca «Continuar».",
          "The first time, type your <font name='Manrope-Bold'>first and "
          "last name</font> and tap “Continue”."),
        L("Ingresa tu <font name='Manrope-Bold'>PIN de 4 dígitos</font> "
          "(te lo da tu supervisor o admin).",
          "Enter your <font name='Manrope-Bold'>4-digit PIN</font> (your "
          "supervisor or admin gives it to you)."),
        L("El dispositivo te recuerda: la próxima vez solo aparece tu nombre "
          "y escribes el PIN. Si el teléfono no es tuyo, toca «¿No eres tú?».",
          "The device remembers you: next time only your name appears and "
          "you just type the PIN. If it's not your phone, tap "
          "“Not you?”."),
    ]))
    s.append(Paragraph(L("Supervisores y administradores (correo)",
                         "Supervisors and administrators (email)"), sub_h))
    s.append(steps_table([
        L("En la pantalla de inicio, toca «Entrar como staff».",
          "On the sign-in screen, tap “Staff sign in”."),
        L("Ingresa tu <font name='Manrope-Bold'>correo y contraseña</font> "
          "y toca «Entrar».",
          "Enter your <font name='Manrope-Bold'>email and password</font> "
          "and tap “Sign in”."),
    ]))
    s.append(Spacer(1, 8))
    s.append(tip_box(L("Seguridad", "Security"), L(
        "Después de 3 intentos incorrectos la cuenta se bloquea por "
        "seguridad. Pide a tu administrador que la desbloquee o te asigne "
        "un PIN nuevo desde «Gestionar equipo».",
        "After 3 wrong attempts the account is locked for security. Ask "
        "your administrator to unlock it or assign you a new PIN from "
        "“Manage team”.")))

    # 3 · Employees
    s += section(L("Sección 3", "Section 3"),
                 L("Para Empleados", "For Employees"),
                 chip=L("Empleado", "Employee"), chip_color=SAGE)
    s.append(Paragraph(L("Crear y enviar un reporte",
                         "Create and submit a report"), sub_h))
    s.append(steps_table([
        L("En Inicio, toca <font name='Manrope-Bold'>«Nuevo reporte»</font>.",
          "On Home, tap <font name='Manrope-Bold'>“New "
          "Report”</font>."),
        L("Escribe el <font name='Manrope-Bold'>tipo de trabajo</font> "
          "(ej. corte de césped) y la <font name='Manrope-Bold'>"
          "ubicación</font> del cliente.",
          "Type the <font name='Manrope-Bold'>job type</font> (e.g. lawn "
          "mowing) and the customer's <font name='Manrope-Bold'>"
          "location</font>."),
        L("El <font name='Manrope-Bold'>GPS</font> se captura solo — "
          "permite el acceso a ubicación si te lo pide.",
          "The <font name='Manrope-Bold'>GPS</font> is captured "
          "automatically — allow location access if asked."),
        L("Toma <font name='Manrope-Bold'>fotos</font> del trabajo "
          "terminado con la cámara de la app.",
          "Take <font name='Manrope-Bold'>photos</font> of the finished "
          "work with the in-app camera."),
        L("Agrega notas si hace falta, revisa el resumen, marca "
          "<font name='Manrope-Bold'>«Trabajo completado»</font> y toca "
          "<font name='Manrope-Bold'>Enviar</font>.",
          "Add notes if needed, review the summary, check "
          "<font name='Manrope-Bold'>“Work completed”</font> and "
          "tap <font name='Manrope-Bold'>Submit</font>."),
    ]))
    s.append(Paragraph(L("Si te piden cambios", "If changes are requested"),
                       sub_h))
    s.append(steps_table([
        L("Recibirás una <font name='Manrope-Bold'>notificación</font> "
          "(campana) con el motivo que escribió tu supervisor.",
          "You'll get a <font name='Manrope-Bold'>notification</font> "
          "(bell) with the reason your supervisor wrote."),
        L("Abre el reporte y toca <font name='Manrope-Bold'>«Editar y "
          "reenviar»</font>.",
          "Open the report and tap <font name='Manrope-Bold'>“Edit "
          "and resubmit”</font>."),
        L("Corrige lo necesario y reenvía. Se repite hasta que el reporte "
          "quede <font name='Manrope-Bold'>aprobado</font>.",
          "Fix what's needed and resubmit. This repeats until the report "
          "is <font name='Manrope-Bold'>approved</font>."),
    ]))
    s.append(Spacer(1, 8))
    s.append(tip_box(L("Sin señal", "No signal"), L(
        "¿Sin internet en el sitio de trabajo? Crea el reporte igual: queda "
        "guardado en tu teléfono («Esperando sincronizar») y se envía solo "
        "cuando vuelve la conexión.",
        "No internet at the job site? Create the report anyway: it stays "
        "saved on your phone (“Awaiting sync”) and is sent "
        "automatically when the connection returns.")))

    # 4 · Supervisors
    s += section(L("Sección 4", "Section 4"),
                 L("Para Supervisores", "For Supervisors"),
                 chip=L("Supervisor", "Supervisor"), chip_color=FOREST)
    s.append(Paragraph(L("Revisar y aprobar reportes",
                         "Review and approve reports"), sub_h))
    s.append(steps_table([
        L("Entra con tu correo: verás el <font name='Manrope-Bold'>panel "
          "del equipo</font> con los reportes recientes y estadísticas "
          "del día.",
          "Sign in with your email: you'll see the <font "
          "name='Manrope-Bold'>team dashboard</font> with recent reports "
          "and today's stats."),
        L("Toca un reporte para abrirlo: fotos (toca para ampliar), GPS "
          "verificado, descripción y notas.",
          "Tap a report to open it: photos (tap to enlarge), verified GPS, "
          "description and notes."),
        L("<font name='Manrope-Bold'>Aprobar:</font> si todo está bien, "
          "toca «Aprobar». El empleado recibe la notificación.",
          "<font name='Manrope-Bold'>Approve:</font> if everything looks "
          "good, tap “Approve”. The employee gets notified."),
        L("<font name='Manrope-Bold'>Pedir cambios:</font> toca «Pedir "
          "cambios», escribe el motivo (qué falta o qué corregir) y envía. "
          "El empleado lo ve y reenvía corregido.",
          "<font name='Manrope-Bold'>Request changes:</font> tap "
          "“Request changes”, write the reason (what's missing or "
          "needs fixing) and send. The employee sees it and resubmits."),
        L("<font name='Manrope-Bold'>PDF:</font> exporta cualquier reporte "
          "a PDF con el botón de descarga (ideal para el cliente).",
          "<font name='Manrope-Bold'>PDF:</font> export any report to PDF "
          "with the download button (great for the customer)."),
    ]))
    s.append(Spacer(1, 8))
    s.append(tip_box(L("Notificaciones", "Notifications"), L(
        "La campana del panel muestra un contador cuando llegan reportes "
        "nuevos o reenviados. Tócala para ver la lista y abrir cada uno.",
        "The bell on the dashboard shows a counter when new or resubmitted "
        "reports arrive. Tap it to see the list and open each one.")))

    # 5 · Admins
    s += section(L("Sección 5", "Section 5"),
                 L("Para Administradores", "For Administrators"),
                 chip="Admin", chip_color=GOLD_DEEP)
    s.append(Paragraph(L(
        "El admin puede todo lo del supervisor y además gestiona al "
        "equipo desde <font name='Manrope-Bold'>Perfil &gt; Gestionar "
        "equipo</font>.",
        "Admins can do everything a supervisor does, plus manage the team "
        "from <font name='Manrope-Bold'>Profile &gt; Manage team</font>."),
        body))
    s.append(Paragraph(L("Agregar un miembro", "Add a team member"), sub_h))
    s.append(steps_table([
        L("Escribe <font name='Manrope-Bold'>nombre y apellido</font>.",
          "Type the <font name='Manrope-Bold'>first and last name</font>."),
        L("Elige el <font name='Manrope-Bold'>rol</font>: empleado o "
          "supervisor (el super admin también puede crear admins).",
          "Choose the <font name='Manrope-Bold'>role</font>: employee or "
          "supervisor (the super admin can also create admins)."),
        L("Elige el acceso: <font name='Manrope-Bold'>PIN de 4 dígitos"
          "</font> (empleados de campo) o <font name='Manrope-Bold'>correo "
          "y contraseña</font> (staff).",
          "Choose the access: <font name='Manrope-Bold'>4-digit PIN</font> "
          "(field employees) or <font name='Manrope-Bold'>email and "
          "password</font> (staff)."),
        L("Toca <font name='Manrope-Bold'>«Crear miembro»</font> y entrega "
          "el PIN o la contraseña a la persona.",
          "Tap <font name='Manrope-Bold'>“Create member”</font> "
          "and hand the PIN or password to the person."),
    ]))
    s.append(Paragraph(L("Resetear, desbloquear y desactivar",
                         "Reset, unlock and deactivate"), sub_h))
    s += bullets([
        L("<font name='Manrope-Bold'>Reiniciar:</font> asigna un PIN o "
          "contraseña nuevos si alguien lo olvidó (también desbloquea).",
          "<font name='Manrope-Bold'>Reset:</font> assign a new PIN or "
          "password if someone forgot it (it also unlocks)."),
        L("<font name='Manrope-Bold'>Desbloquear:</font> libera una cuenta "
          "bloqueada por intentos fallidos.",
          "<font name='Manrope-Bold'>Unlock:</font> release an account "
          "locked by failed attempts."),
        L("<font name='Manrope-Bold'>Desactivar:</font> corta el acceso de "
          "alguien que ya no trabaja en la empresa (sin borrar su "
          "historial).",
          "<font name='Manrope-Bold'>Deactivate:</font> remove access for "
          "someone who no longer works at the company (their history is "
          "kept)."),
        L("El PIN no puede repetirse entre empleados activos: si el sistema "
          "lo rechaza, elige otro.",
          "PINs can't be shared between active employees: if the system "
          "rejects one, pick another."),
    ])
    s.append(Spacer(1, 8))
    s.append(tip_box(L("Sobre la ubicación GPS", "About GPS location"), L(
        "La ubicación sale del GPS del teléfono, no de la red: una VPN "
        "<font name='Manrope-Bold'>no</font> la cambia. Sí existen apps de "
        "«ubicación falsa» (sobre todo en Android) y ninguna aplicación web "
        "puede detectarlas con certeza. Mitigación: cada reporte registra la "
        "precisión (±m), la dirección legible y exige fotos del trabajo — "
        "si la ubicación no cuadra con las fotos o el cliente, pide cambios.",
        "Location comes from the phone's GPS, not the network: a VPN does "
        "<font name='Manrope-Bold'>not</font> change it. “Fake "
        "location” apps do exist (mostly on Android) and no web app can "
        "detect them with certainty. Mitigation: every report records the "
        "accuracy (±m), the readable address and requires photos of the "
        "work — if the location doesn't match the photos or the customer, "
        "request changes.")))
    s.append(Paragraph(L("Todas las funciones de la app",
                         "Complete feature list"), sub_h))
    s += bullets([
        L("Reportes de campo con fotos, GPS y notas; confirmación de "
          "trabajo completado.",
          "Field reports with photos, GPS and notes; work-completed "
          "confirmation."),
        L("Funciona sin conexión: el reporte se guarda en el teléfono y se "
          "sincroniza solo.",
          "Works offline: reports are saved on the phone and sync "
          "automatically."),
        L("Fotos comprimidas automáticamente para ahorrar datos.",
          "Photos are compressed automatically to save data."),
        L("GPS con precisión registrada (±m), dirección legible y botón "
          "«Abrir en Mapas» (también en el PDF).",
          "GPS with recorded accuracy (±m), readable address and an "
          "“Open in Maps” button (also in the PDF)."),
        L("Flujo de revisión: aprobar, pedir cambios con motivo, y "
          "reenviar hasta aprobar.",
          "Review flow: approve, request changes with a reason, and "
          "resubmit until approved."),
        L("Notificaciones dentro de la app con contador (nuevos reportes, "
          "aprobados, cambios pedidos).",
          "In-app notifications with a counter (new reports, approvals, "
          "change requests)."),
        L("Exportar cualquier reporte a PDF con la marca, fotos, firma y "
          "enlace al mapa (bilingüe).",
          "Export any report to a branded PDF with photos, signature and "
          "map link (bilingual)."),
        L("4 roles con permisos en el servidor: empleado, supervisor, "
          "admin y super admin.",
          "4 roles enforced server-side: employee, supervisor, admin and "
          "super admin."),
        L("Acceso de empleados con nombre + PIN (el dispositivo los "
          "recuerda); staff con correo + contraseña.",
          "Employee access with name + PIN (the device remembers them); "
          "staff with email + password."),
        L("Seguridad: bloqueo tras 3 intentos, PINs únicos, desbloqueo y "
          "reseteo por el admin, datos protegidos por rol en la base de "
          "datos.",
          "Security: lock after 3 attempts, unique PINs, admin unlock and "
          "reset, role-protected data at the database level."),
        L("Gestión de equipo: crear miembros, resetear accesos, "
          "desbloquear, activar/desactivar.",
          "Team management: create members, reset access, unlock, "
          "activate/deactivate."),
        L("Bilingüe español/inglés en toda la app y el PDF (se detecta "
          "solo; cambiable en Perfil).",
          "Bilingual Spanish/English across the app and PDF "
          "(auto-detected; changeable in Profile)."),
        L("Instalable como app (Android, iPhone y computadora) con su "
          "propio ícono.",
          "Installable as an app (Android, iPhone and desktop) with its "
          "own icon."),
        L("Actualizaciones automáticas: la app se actualiza sola, nunca "
          "hay que reinstalarla.",
          "Automatic updates: the app updates itself — no reinstalling, "
          "ever."),
        L("Manual de uso integrado (Perfil > Manual de uso) según el rol, "
          "más este PDF descargable.",
          "Built-in user manual (Profile > User manual) per role, plus "
          "this downloadable PDF."),
    ])

    # 6 · FAQ
    s += section(L("Sección 6", "Section 6"),
                 L("Preguntas frecuentes", "FAQ"))
    faq = [
        (L("Olvidé mi PIN o contraseña", "I forgot my PIN or password"),
         L("Pide a tu admin que lo reinicie desde Gestionar equipo. Te dará "
           "uno nuevo al instante.",
           "Ask your admin to reset it from Manage team. You'll get a new "
           "one instantly.")),
        (L("Mi cuenta está bloqueada", "My account is locked"),
         L("Pasa tras 3 intentos fallidos. Tu admin puede desbloquearla al "
           "instante desde Gestionar equipo.",
           "It happens after 3 failed attempts. Your admin can unlock it "
           "instantly from Manage team.")),
        (L("No tengo señal en el sitio", "I have no signal on site"),
         L("Crea el reporte normal: se guarda en el teléfono y se envía "
           "solo al volver la conexión.",
           "Create the report as usual: it's saved on the phone and sent "
           "automatically when you're back online.")),
        (L("¿Cómo cambio el idioma?", "How do I change the language?"),
         L("Perfil &gt; Idioma: español o inglés. El PDF de los reportes "
           "también sale en el idioma elegido.",
           "Profile &gt; Language: English or Spanish. Report PDFs also "
           "come out in the chosen language.")),
        (L("¿Mis fotos gastan datos?", "Do my photos use a lot of data?"),
         L("Las fotos se comprimen automáticamente antes de enviarse para "
           "ahorrar datos.",
           "Photos are compressed automatically before upload to save "
           "data.")),
    ]
    for q, a in faq:
        s.append(KeepTogether([
            Paragraph(q, sub_h),
            Paragraph(a, body),
        ]))

    # 7 · Troubleshooting
    s += section(L("Sección 7", "Section 7"),
                 L("Solución de problemas", "Troubleshooting"))
    trouble = [
        (L("El GPS no se captura", "GPS isn't captured"),
         L("Permite el acceso a ubicación y reintenta desde el reporte. "
           "iPhone: Ajustes &gt; Privacidad y seguridad &gt; Localización "
           "&gt; Safari (o la app). Android: Ajustes &gt; Aplicaciones &gt; "
           "Chrome &gt; Permisos &gt; Ubicación.",
           "Allow location access and retry from the report. iPhone: "
           "Settings &gt; Privacy &amp; Security &gt; Location Services "
           "&gt; Safari (or the app). Android: Settings &gt; Apps &gt; "
           "Chrome &gt; Permissions &gt; Location.")),
        (L("La cámara no abre", "The camera won't open"),
         L("Es el permiso de Cámara: actívalo en los ajustes del teléfono "
           "(misma ruta que el GPS). También puedes subir fotos desde la "
           "galería con el botón de la izquierda.",
           "It's the Camera permission: enable it in your phone settings "
           "(same path as GPS). You can also upload photos from your "
           "gallery with the left button.")),
        (L("Mi reporte dice «Esperando sincronizar»",
           "My report says “Awaiting sync”"),
         L("No había conexión al enviarlo. Está guardado en tu teléfono: "
           "abre la app cuando tengas señal o WiFi y se envía solo.",
           "There was no connection when you sent it. It's saved on your "
           "phone: open the app when you have signal or WiFi and it sends "
           "itself.")),
        (L("Sale «No se pudo cargar. Revisa tu conexión»",
           "I see “Couldn't load. Check your connection”"),
         L("Toca «Reintentar». Si sigue, revisa tu señal o WiFi. Tus datos "
           "no se pierden.",
           "Tap “Retry”. If it persists, check your signal or "
           "WiFi. Your data is not lost.")),
        (L("¿Cómo se actualiza la app?", "How does the app update?"),
         L("Sola. Busca versiones nuevas al abrirla, al volver a primer "
           "plano y cada 30 minutos, y se recarga automáticamente. Nunca "
           "hay que desinstalarla ni reinstalarla. Si justo no ves un "
           "cambio, ciérrala y ábrela una vez.",
           "By itself. It checks for new versions when opened, when "
           "brought back to the foreground and every 30 minutes, then "
           "reloads automatically. You never need to uninstall or "
           "reinstall it. If you don't see a change yet, close and reopen "
           "it once.")),
        (L("Dice «Reporte no encontrado»", "It says “Report not found”"),
         L("Ese reporte pertenece a otra cuenta o fue eliminado. Verifica "
           "que entraste con tu propia cuenta.",
           "That report belongs to another account or was deleted. Make "
           "sure you signed in with your own account.")),
        (L("(Admins) «PIN already in use» al crear un miembro",
           "(Admins) “PIN already in use” when creating a member"),
         L("Ese PIN ya lo usa otro empleado activo: elige uno diferente. "
           "Y si alguien del staff olvidó su contraseña, usa «Reiniciar» "
           "en Gestionar equipo.",
           "That PIN is already used by another active employee: pick a "
           "different one. And if a staff member forgot their password, "
           "use “Reset” in Manage team.")),
    ]
    for q, a in trouble:
        s.append(KeepTogether([
            Paragraph(q, sub_h),
            Paragraph(a, body),
        ]))
    s.append(Spacer(1, 16))
    s.append(tip_box(L("Soporte", "Support"), L(
        "¿Algo no funciona como esperabas? Escribe a tu administrador o al "
        "equipo de Onserk que entregó la aplicación.",
        "Something not working as expected? Contact your administrator or "
        "the Onserk team that delivered the application.")))
    return s


def build(lang, filename):
    path = os.path.join(OUT, filename)
    doc = BaseDocTemplate(
        path, pagesize=letter,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=0.95 * inch, bottomMargin=0.8 * inch,
        title=t(lang, "Manual de Uso - Field Reports",
                "User Manual - Field Reports"),
        author="Kingdoms Touch Services",
    )
    frame = Frame(MARGIN, 0.8 * inch, PAGE_W - 2 * MARGIN,
                  PAGE_H - 0.95 * inch - 0.8 * inch, id="main")
    cover_frame = Frame(MARGIN, 0.8 * inch, PAGE_W - 2 * MARGIN,
                        PAGE_H - 1.75 * inch, id="cover")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame],
                     onPage=make_cover(lang)),
        PageTemplate(id="Body", frames=[frame], onPage=make_decor(lang)),
    ])
    from reportlab.platypus import NextPageTemplate, PageBreak
    story = [NextPageTemplate("Body"), PageBreak()]
    story += build_story(lang)
    doc.build(story)
    print("OK", path)


if __name__ == "__main__":
    build("es", "manual-es.pdf")
    build("en", "manual-en.pdf")
