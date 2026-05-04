/* ============================================================
   15 · Tareas & Actividades · rediseño v2.2
   Mockups React (Babel inline) — usa primitives del HTML
   ============================================================ */

/* ---------- Phone wrapper ---------- */
function Phone({ children, label, dim }) {
  return (
    <div className="phone phone-tall" style={{ position: 'relative' }}>
      {label && <div className="spec-label">{label}</div>}
      <div className="statusbar">
        <span>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 📶 🔋</span>
      </div>
      <div className="phone-screen" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 64 }}>
        <div style={{ filter: dim ? 'brightness(0.55) saturate(0.7)' : 'none' }}>
          {children}
        </div>
      </div>
      <div className="bottomnav">
        <div className="bottomnav-item active"><span>🏠</span><span>Inicio</span></div>
        <div className="bottomnav-item"><span>✓</span><span>Tareas</span></div>
        <div className="bottomnav-item"><span>🎯</span><span>Actividades</span></div>
        <div className="bottomnav-item"><span>📊</span><span>Analítica</span></div>
        <div className="bottomnav-item"><span>⚙</span><span>Más</span></div>
      </div>
    </div>
  );
}

/* ---------- Top tabs MP+ / MP− ---------- */
function MPTabs({ active }) {
  return (
    <div className="mptabs">
      <div className={`mptab add ${active === 'tasks' ? 'active' : 'muted'}`}>
        <span className="sign">＋ MP</span>
        <span className="lbl">Tareas</span>
        <span className="sub">Suman matripuntos</span>
        <span className="indicator" />
      </div>
      <div className={`mptab spend ${active === 'activities' ? 'active' : 'muted'}`}>
        <span className="sign">− MP</span>
        <span className="lbl">Actividades</span>
        <span className="sub">Consumen matripuntos</span>
        <span className="indicator" />
      </div>
    </div>
  );
}

/* ---------- Header strip — segunda fila simplificada ---------- */
function HeaderStrip({ filter = 'mias', onSpend }) {
  return (
    <div className="hstrip">
      <div className="seg">
        <button className={filter === 'mias' ? `on ${onSpend ? '' : 'add'}` : ''}>
          {onSpend ? 'Activas' : 'Mías'}
        </button>
        <button className={filter === 'todas' ? 'on' : ''}>Todas</button>
        <button className={filter === 'recurr' ? 'on' : ''}>{onSpend ? 'Plantillas' : 'Recurrentes'}</button>
      </div>
      <button className="icobtn" title="Lista / Semana">📅</button>
      <button className={`icobtn primary ${onSpend ? 'spend' : ''}`} title="Añadir">＋</button>
    </div>
  );
}

/* ---------- Verify banner ---------- */
function VerifyBanner({ name = 'Edu', task = 'Cocinar la cena', pts = 12 }) {
  return (
    <div className="verify-card">
      <div className="ico">👀</div>
      <div className="vtext">
        <span className="who">{name}</span> ha completado <b>{task}</b>.
        <br />¿Confirmas? Se acreditan <b>+{pts} MP</b> al verificar.
      </div>
      <div className="vactions">
        <button className="ok">✓ Verificar</button>
        <button className="later">Después</button>
      </div>
    </div>
  );
}

/* ---------- Section header ---------- */
function SectionH({ title, day, count, total, spend }) {
  return (
    <div className="sec-h">
      <h3>{title}{day && <span className="day">· {day}</span>}</h3>
      {(count !== undefined) && (
        <span className={`count ${spend ? 'spend' : ''}`}>
          <b>{count}</b>/{total}
        </span>
      )}
    </div>
  );
}

/* ---------- Task row ---------- */
function TaskRow({ name, cat, pts, done, recur, owner, scheduled, spend }) {
  return (
    <div className={`trow ${done ? 'done' : ''} ${spend ? 'spend' : ''}`}>
      <div className="checkbox">{done ? '✓' : ''}</div>
      <div className="body">
        <div className="name">{name} {recur && <span className="recur" title="Recurrente">↺</span>}</div>
        <div className="meta">
          {cat && <span className="cat-pill">{cat}</span>}
          {owner && <><span>{owner}</span><span className="dot" /></>}
          {scheduled && <span>{scheduled}</span>}
        </div>
      </div>
      <div className="pts">{spend ? `−${pts}` : `+${pts}`}<span className="u">MP</span></div>
    </div>
  );
}

/* ============================================================ */
/* SCREEN 01 · Tareas — vista principal con datos               */
/* ============================================================ */
function S01_TasksMain() {
  return (
    <Phone label="01 · Tareas con datos">
      <MPTabs active="tasks" />
      <div className="pg-h">
        <h1>Tareas</h1>
        <span className="balance">Saldo · 1.240 MP</span>
      </div>
      <HeaderStrip />

      <VerifyBanner name="Blanca" task="Limpiar baño completo" pts={15} />

      <div className="sec">
        <SectionH title="Hoy" day="lun · 4 may" count={1} total={3} />
        <TaskRow name="Cocinar la cena" cat="cocina" pts={12} recur owner="A ti" />
        <TaskRow name="Sacar a pasear al perro" cat="mascotas" pts={5} recur owner="Blanca" />
        <TaskRow done name="Vaciar el lavavajillas" cat="cocina" pts={5} owner="A ti" />
      </div>

      <div className="sec">
        <SectionH title="Esta semana" count={0} total={2} />
        <TaskRow name="Hacer la compra semanal" cat="compra" pts={18} owner="A ti" scheduled="jueves" />
        <TaskRow name="Pasar la aspiradora" cat="limpieza" pts={10} recur owner="Blanca" scheduled="sábado" />
      </div>

      <div className="hist-link">Ver <span>historial completo →</span></div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 02 · Tareas — Todo al día (empty pero "lleno")        */
/* ============================================================ */
function S02_TasksAllDone() {
  return (
    <Phone label="02 · Todo al día">
      <MPTabs active="tasks" />
      <div className="pg-h">
        <h1>Tareas</h1>
        <span className="balance">Saldo · 1.240 MP</span>
      </div>
      <HeaderStrip />

      <div className="sec">
        <SectionH title="Hoy" day="lun · 4 may" count={3} total={3} />
        <TaskRow done name="Cocinar la cena" cat="cocina" pts={12} owner="A ti" />
        <TaskRow done name="Vaciar el lavavajillas" cat="cocina" pts={5} owner="A ti" />
        <TaskRow done name="Sacar a pasear al perro" cat="mascotas" pts={5} owner="Blanca" />
      </div>

      <div style={{ margin: '14px 16px', padding: 18, textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(168,85,247,0.06))', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 16 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Todo al día</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Hoy cerráis con <b style={{ color: 'var(--success)' }}>+22 MP</b> entre los dos.
          {' '}Mañana hay 2 más esperando.
        </div>
      </div>

      <div className="sec">
        <SectionH title="Esta semana" count={1} total={3} />
        <TaskRow name="Hacer la compra semanal" cat="compra" pts={18} owner="A ti" scheduled="jueves" />
        <TaskRow name="Pasar la aspiradora" cat="limpieza" pts={10} recur owner="Blanca" scheduled="sábado" />
      </div>

      <div className="hist-link">Ver <span>historial completo →</span></div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 03 · Tareas — vista Semana                            */
/* ============================================================ */
function S03_TasksWeek() {
  return (
    <Phone label="03 · Vista semana">
      <MPTabs active="tasks" />
      <div className="pg-h">
        <h1>Tareas</h1>
        <span className="balance">Sem · +47 MP</span>
      </div>
      <HeaderStrip />

      <div className="week-strip">
        {[
          { dn: 'L', dd: 4, today: true, pip: 'amber' },
          { dn: 'M', dd: 5, pip: 'amber' },
          { dn: 'X', dd: 6, pip: null },
          { dn: 'J', dd: 7, pip: 'both' },
          { dn: 'V', dd: 8, pip: 'spend' },
          { dn: 'S', dd: 9, pip: 'amber' },
          { dn: 'D', dd: 10, pip: null },
        ].map((d, i) => (
          <div key={i} className={`week-day ${d.today ? 'today' : ''}`}>
            <div className="dn">{d.dn}</div>
            <div className="dd">{d.dd}</div>
            <div className={`pip ${d.pip || ''}`} style={{ visibility: d.pip ? 'visible' : 'hidden' }} />
          </div>
        ))}
      </div>

      <div className="day-block">
        <div className="dh today">Hoy · lunes 4 <small>1/3 hechas · +5 MP</small></div>
        <TaskRow done name="Vaciar el lavavajillas" cat="cocina" pts={5} owner="A ti" />
        <TaskRow name="Cocinar la cena" cat="cocina" pts={12} owner="A ti" recur />
        <TaskRow name="Sacar a pasear al perro" cat="mascotas" pts={5} owner="Blanca" recur />
      </div>

      <div className="day-block">
        <div className="dh">martes 5 <small>2 previstas</small></div>
        <TaskRow name="Poner la lavadora" cat="limpieza" pts={6} owner="A ti" recur />
        <TaskRow name="Tender la ropa" cat="limpieza" pts={6} owner="Blanca" recur />
      </div>

      <div className="day-block">
        <div className="dh">jueves 7 <small>1 prevista</small></div>
        <TaskRow name="Hacer la compra semanal" cat="compra" pts={18} owner="A ti" />
      </div>

      <div className="hist-link">Ver <span>semana siguiente →</span></div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 04 · "+ Tarea" sheet — del catálogo + crear           */
/* ============================================================ */
function S04_AddTaskSheet() {
  return (
    <Phone label="04 · Añadir tarea (sheet)" dim>
      <MPTabs active="tasks" />
      <div className="pg-h">
        <h1>Tareas</h1>
        <span className="balance">Saldo · 1.240 MP</span>
      </div>
      <HeaderStrip />

      <div className="sec">
        <SectionH title="Hoy" day="lun · 4 may" count={1} total={3} />
        <TaskRow name="Cocinar la cena" cat="cocina" pts={12} recur owner="A ti" />
        <TaskRow name="Sacar a pasear al perro" cat="mascotas" pts={5} recur owner="Blanca" />
      </div>

      {/* Sheet superpuesto */}
      <div className="sheet-wrap">
        <div className="sheet" style={{ height: '78%' }}>
          <div className="grab" />
          <h2>Añadir tarea <span className="x">×</span></h2>
          <div className="sheet-tabs">
            <button className="on">📚 Del catálogo <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>40 ideas</span></button>
            <button>✏ Crear nueva</button>
          </div>
          <div className="sheet-search">
            <span>🔍</span>
            <input placeholder="Buscar tarea…" defaultValue="" />
          </div>
          <div className="sheet-chips">
            <span className="chip on">Todas</span>
            <span className="chip">Cocina</span>
            <span className="chip">Limpieza</span>
            <span className="chip">Baños</span>
            <span className="chip">Compra</span>
            <span className="chip">Logística</span>
          </div>

          <div className="cat-list" style={{ maxHeight: 280 }}>
            <div className="cat-grp-h">🍳 Cocina</div>
            <div className="cat-row added">
              <div className="cat-emoji" style={{ background: 'rgba(245,158,11,0.18)' }}>🍳</div>
              <div className="cn">Cocinar la cena</div>
              <div className="cp">12 MP</div>
              <div className="add-ic">✓</div>
            </div>
            <div className="cat-row">
              <div className="cat-emoji" style={{ background: 'rgba(245,158,11,0.18)' }}>☕</div>
              <div className="cn">Preparar el desayuno</div>
              <div className="cp">6 MP</div>
              <div className="add-ic">＋</div>
            </div>
            <div className="cat-row">
              <div className="cat-emoji" style={{ background: 'rgba(245,158,11,0.18)' }}>🧽</div>
              <div className="cn">Limpiar la cocina</div>
              <div className="cp">12 MP</div>
              <div className="add-ic">＋</div>
            </div>
            <div className="cat-grp-h">🧺 Limpieza</div>
            <div className="cat-row">
              <div className="cat-emoji">🧹</div>
              <div className="cn">Pasar la aspiradora</div>
              <div className="cp">10 MP</div>
              <div className="add-ic">＋</div>
            </div>
            <div className="cat-row">
              <div className="cat-emoji">👕</div>
              <div className="cn">Doblar y guardar ropa</div>
              <div className="cp">8 MP</div>
              <div className="add-ic">＋</div>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 05 · Tareas — banner verificación destacado           */
/* ============================================================ */
function S05_VerifyBanner() {
  return (
    <Phone label="05 · Verificación · banner condicional">
      <MPTabs active="tasks" />
      <div className="pg-h">
        <h1>Tareas</h1>
        <span className="balance">Saldo · 1.240 MP</span>
      </div>
      <HeaderStrip />

      <VerifyBanner name="Blanca" task="Limpiar baño completo" pts={15} />

      <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: 'rgba(168,85,247,0.05)', border: '1px dashed rgba(168,85,247,0.25)', borderRadius: 10, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        <b style={{ color: 'var(--brand-purple)' }}>+1 más</b> esperando tu verificación · <span style={{ color: 'var(--brand-purple)', fontWeight: 700, cursor: 'pointer' }}>ver todas →</span>
      </div>

      <div className="sec">
        <SectionH title="Hoy" day="lun · 4 may" count={1} total={3} />
        <TaskRow name="Cocinar la cena" cat="cocina" pts={12} recur owner="A ti" />
        <TaskRow done name="Vaciar el lavavajillas" cat="cocina" pts={5} owner="A ti" />
        <TaskRow name="Sacar a pasear al perro" cat="mascotas" pts={5} recur owner="Blanca" />
      </div>

      <div className="sec">
        <SectionH title="Esta semana" count={0} total={2} />
        <TaskRow name="Hacer la compra semanal" cat="compra" pts={18} owner="A ti" scheduled="jueves" />
      </div>

      <div className="hist-link">Ver <span>historial completo →</span></div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 06 · Actividades — vista principal con 2 activas      */
/* ============================================================ */
function S06_Activities() {
  return (
    <Phone label="06 · Actividades activas">
      <MPTabs active="activities" />
      <div className="pg-h">
        <h1>Actividades</h1>
        <span className="balance spend">Saldo · 1.240 MP</span>
      </div>
      <HeaderStrip onSpend />

      <div className="sec">
        <SectionH title="Pendientes de tu respuesta" count={1} total={1} spend />
      </div>

      <div className="act-card">
        <div className="top">
          <div className="ico">🎬</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">Cine — viernes noche</div>
            <div className="meta"><span className="when">vie 8 may · 21:30</span> · propuesta de Blanca</div>
          </div>
          <div className="price">−80 MP</div>
        </div>
        <div className="status">
          <b>Blanca propone</b> esta actividad. Acepta para reservar y restar los puntos.
        </div>
        <div className="actions">
          <button className="accept">✓ Aceptar</button>
          <button className="neg">Negociar</button>
          <button className="reject">Rechazar</button>
        </div>
      </div>

      <div className="sec">
        <SectionH title="Confirmadas" count={1} total={1} spend />
      </div>

      <div className="act-card">
        <div className="top">
          <div className="ico" style={{ background: 'rgba(34,197,94,0.15)' }}>🍽</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">Cena fuera — sábado</div>
            <div className="meta"><span className="when">sáb 9 may · 20:30</span> · italiano del barrio</div>
          </div>
          <div className="price">−120 MP</div>
        </div>
        <div className="status confirmed">
          <b>Confirmada</b>. Saldo descontado al cierre del día.
        </div>
      </div>

      <div className="hist-link">Ver <span>historial completo →</span></div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 07 · Actividades — Catálogo (mantenido v2.0.4-2.1.1)  */
/* ============================================================ */
function S07_ActivitiesCatalog() {
  return (
    <Phone label="07 · Catálogo actividades">
      <MPTabs active="activities" />
      <div className="pg-h">
        <h1>Actividades</h1>
        <span className="balance spend">50 plantillas</span>
      </div>
      <div className="hstrip">
        <div className="seg">
          <button>Activas</button>
          <button>Plantillas</button>
          <button className="on">Catálogo</button>
        </div>
        <button className="icobtn primary spend" title="Crear plantilla">＋</button>
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <div className="sheet-search" style={{ margin: 0 }}>
          <span>🔍</span>
          <input placeholder="Buscar plantilla…" />
        </div>
      </div>

      <div className="sheet-chips" style={{ padding: '0 16px 10px' }}>
        <span className="chip on">Todas</span>
        <span className="chip">Ocio en pareja</span>
        <span className="chip">Comida fuera</span>
        <span className="chip">Tiempo solo</span>
        <span className="chip">Viajes</span>
      </div>

      <div className="cat-list">
        <div className="cat-grp-h">🎬 Ocio en pareja</div>
        <div className="cat-row">
          <div className="cat-emoji">🎬</div>
          <div className="cn">Cine — sesión normal</div>
          <div className="cp">−80</div>
          <div className="add-ic">＋</div>
        </div>
        <div className="cat-row">
          <div className="cat-emoji">🎭</div>
          <div className="cn">Teatro / concierto</div>
          <div className="cp">−150</div>
          <div className="add-ic">＋</div>
        </div>
        <div className="cat-row">
          <div className="cat-emoji">🥾</div>
          <div className="cn">Excursión de un día</div>
          <div className="cp">−100</div>
          <div className="add-ic">＋</div>
        </div>
        <div className="cat-grp-h">🍽 Comida fuera</div>
        <div className="cat-row">
          <div className="cat-emoji" style={{ background: 'rgba(245,158,11,0.18)' }}>🍕</div>
          <div className="cn">Cena casual</div>
          <div className="cp">−120</div>
          <div className="add-ic">＋</div>
        </div>
        <div className="cat-row">
          <div className="cat-emoji" style={{ background: 'rgba(245,158,11,0.18)' }}>🍷</div>
          <div className="cn">Cena especial</div>
          <div className="cp">−250</div>
          <div className="add-ic">＋</div>
        </div>
        <div className="cat-grp-h">🌿 Tiempo solo</div>
        <div className="cat-row">
          <div className="cat-emoji" style={{ background: 'rgba(34,197,94,0.15)' }}>🧘</div>
          <div className="cn">Yoga / spa</div>
          <div className="cp">−60</div>
          <div className="add-ic">＋</div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================ */
/* SCREEN 08 · Top tabs — anatomía visual                       */
/* ============================================================ */
function S08_TabsAnatomy() {
  return (
    <div style={{ width: 600, padding: 24, background: 'var(--surface-card)', border: '1px solid var(--brd-subtle)', borderRadius: 16 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Top tabs — anatomía visual</h3>
      <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        El cambio crítico: el usuario ve <b style={{ color: 'var(--text-primary)' }}>en qué dirección va el dinero</b> antes de leer el label.
      </p>

      <div style={{ background: 'var(--bg-page)', padding: 16, borderRadius: 12, marginBottom: 18 }}>
        <MPTabs active="tasks" />
      </div>

      <div style={{ background: 'var(--bg-page)', padding: 16, borderRadius: 12, marginBottom: 6 }}>
        <MPTabs active="activities" />
      </div>

      <h4 style={{ margin: '20px 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--brand-amber)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Por qué funciona</h4>
      <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        <li><b style={{ color: 'var(--text-primary)' }}>Signo visible</b> — el chip <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '1px 5px', borderRadius: 3 }}>＋ MP</code> / <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.12)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>− MP</code> es lo que ancla el modelo mental, no el emoji.</li>
        <li><b style={{ color: 'var(--text-primary)' }}>Color del sistema</b>, no del adorno: <span style={{ color: 'var(--success)' }}>verde</span> = ingreso (tareas), <span style={{ color: 'var(--brand-purple)' }}>morado</span> = gasto (actividades). Ya están en el saldo del hero — coherencia.</li>
        <li><b style={{ color: 'var(--text-primary)' }}>Sin emojis de adorno</b> en la tab seleccionada — si quitas decoración decorativa, el rol económico es lo único que queda.</li>
        <li><b style={{ color: 'var(--text-primary)' }}>Subtítulo educativo</b> ("Suman matripuntos" / "Consumen matripuntos") solo en tabs grandes; desaparece en pasadas siguientes — onboarding silencioso.</li>
      </ul>

      <h4 style={{ margin: '20px 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--brand-amber)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tokens nuevos</h4>
      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.08)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>--mp-add</code> = <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(34,197,94,0.12)', color: 'var(--success)', padding: '1px 5px', borderRadius: 3 }}>#22c55e</code> (alias de <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.08)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>--success</code>)
        <br />
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.08)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>--mp-spend</code> = <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.12)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>#a855f7</code> (alias de <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, background: 'rgba(168,85,247,0.08)', color: 'var(--brand-purple)', padding: '1px 5px', borderRadius: 3 }}>--brand-purple</code>)
      </div>
    </div>
  );
}

/* ============================================================ */
/* PANELS · Diagnosis / Decisions / Storyboard                  */
/* ============================================================ */

function PanelDiagnosis() {
  return (
    <div className="panel">
      <h3>Diagnóstico — el caos en pantalla A</h3>
      <p className="lede">
        Hoy hay <b>4 niveles de UI</b> apilados antes de ver una sola tarea. Para alguien nuevo, esto es lo que ve: tabs, tabs, toggle, chips. <b>Ninguna tarea</b>.
      </p>
      <h4>Niveles actuales (orden de aparición)</h4>
      <div className="row"><b>1.</b> Top tabs <code>Tareas | Actividades</code></div>
      <div className="row"><b>2.</b> Header <code>Tareas</code> + chip "Esta semana" + ↺ + <span style={{ color: 'var(--brand-amber)', fontWeight: 700 }}>"+ Añadir tarea"</span> + <span style={{ color: 'var(--text-tertiary)' }}>"+ Crear nueva"</span></div>
      <div className="row"><b>3.</b> Segment <code>Lista | Semana</code></div>
      <div className="row"><b>4.</b> Inner tabs <code>Mis Tareas | Recurrentes | Verificar | Historial</code></div>
      <div className="row" style={{ borderColor: 'rgba(239,68,68,0.30)' }}><b>5.</b> Chips horizontales <code>Todas | Cocina | Limpieza…</code> <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 11 }}>+1</span></div>

      <h4>Lo que se va</h4>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>Inner tab "Recurrentes"</span> → filtro dentro del segment principal (Mías / Todas / <b>Recurrentes</b>) y configuración fina en Settings.</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>Inner tab "Verificar"</span> → <b>banner condicional</b> arriba cuando hay algo. Si no hay, no ocupa.</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>Inner tab "Historial"</span> → <b>link al final</b> del scroll (siempre con scroll en pantallas con datos).</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>"+ Crear nueva" como botón hermano</span> → segunda <b>pestaña dentro del sheet "+ Tarea"</b>.</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>Chips de categoría siempre visibles</span> → solo dentro del sheet de añadir, donde sirven para filtrar el catálogo.</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>"📋 Ver catálogo (40 ideas) ▼" colapsado al fondo</span> → fuente principal del CTA primario "+", sin acordeón.</li>
        <li><span className="strike" style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>Toggle Lista/Semana con label</span> → <b>icono 📅 al lado del +</b>, sin texto, recordable.</li>
      </ul>
    </div>
  );
}

function PanelDecisions() {
  return (
    <div className="panel" style={{ width: 460 }}>
      <h3>Decisiones — las 8 que pidió el handoff</h3>
      <p className="lede">
        Mi instinto coincide con el tuyo en las 8. Confirmadas con matiz en algunos casos:
      </p>

      <div className="dec-table">
        <div className="head">#</div><div className="head">Decisión</div><div className="head">Resultado</div>

        <div className="num">1</div>
        <div>Niveles de UI antes del contenido</div>
        <div><span className="out">2 fijos</span> (top tabs · header strip). Sub-filtro de chips solo dentro del sheet.</div>

        <div className="num">2</div>
        <div>Tab "Recurrentes"</div>
        <div><span className="out">Subordinada</span>: filtro dentro del segment, no tab. Edición fina en Settings → Reglas.</div>

        <div className="num">3</div>
        <div>"Verificar"</div>
        <div><span className="out">Banner condicional</span>. Pantalla 05 muestra el estado con banner; si no hay nada, ocupa 0px.</div>

        <div className="num">4</div>
        <div>"Historial"</div>
        <div><span className="out">Link al final</span>. Aparece tras la sección "Esta semana", siempre que haya algún log previo.</div>

        <div className="num">5</div>
        <div>Botón primario</div>
        <div><span className="out">Uno solo: "+"</span>. Sheet con 2 pestañas: <b>📚 Del catálogo</b> (default) y <b>✏ Crear nueva</b>.</div>

        <div className="num">6</div>
        <div>Lista vs Semana</div>
        <div><span className="out">Icono 📅</span> al lado del "+", sin label. Estado guardado en localStorage.</div>

        <div className="num">7</div>
        <div>Top tabs +MP / −MP</div>
        <div><span className="out">Sí</span>. Verde para tareas, morado para actividades. Mockup detallado en card 08.</div>

        <div className="num">8</div>
        <div>Simetría Tareas/Actividades</div>
        <div><span className="out">Sí, mismo modelo</span>. Header strip idéntico, secciones temporales idénticas. Plantillas = Recurrentes.</div>
      </div>

      <h4>Lo que NO hago aunque parezca tentador</h4>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        <li>No mezclar tareas y actividades en una misma lista. <b>Distinción económica</b> es el modelo mental — un feed mezclado lo destruye.</li>
        <li>No esconder los puntos. <b>+12 MP</b> en cada row es lo que justifica el sistema.</li>
        <li>No celebrar al completar una tarea cotidiana. <span style={{ color: 'var(--brand-amber)', fontWeight: 700 }}>Asistente, no casino</span> (canvas 13).</li>
      </ul>
    </div>
  );
}

function PanelStoryboard() {
  return (
    <div className="panel wide">
      <h3>Primera tarea sin escanear 4 niveles — recorrido</h3>
      <p className="lede">El usuario nuevo abre Tareas por primera vez. Objetivo: <b>completar 1 tarea en menos de 30 segundos</b>.</p>

      <div className="story-flow">
        <div className="story-step">
          <small>0:00 · entra</small>
          <b>Ve top tabs +MP / −MP</b>
          Aprende el modelo en una mirada: Tareas suman, Actividades restan. La selected es Tareas con un signo verde "+ MP".
        </div>
        <div className="story-arrow">→</div>
        <div className="story-step">
          <small>0:05 · empty</small>
          <b>Empty state cálido</b>
          Card grande con ✨ + "Empieza con una tarea de hoy" y un único botón gordo: "📚 Elegir del catálogo". Cero ambigüedad.
        </div>
        <div className="story-arrow">→</div>
        <div className="story-step">
          <small>0:08 · sheet</small>
          <b>Sheet "+ Tarea" abierto en "Del catálogo"</b>
          Los 40 elementos por categoría, scroll vertical. Pestaña "Crear nueva" visible pero secundaria.
        </div>
        <div className="story-arrow">→</div>
        <div className="story-step">
          <small>0:14 · pick</small>
          <b>Tap a "Cocinar la cena · 12 MP"</b>
          El botón "+" se vuelve "✓", el sheet permanece abierto para añadir 1-2 más sin re-abrir.
        </div>
        <div className="story-arrow">→</div>
        <div className="story-step">
          <small>0:22 · cierra</small>
          <b>Toast amber: "Añadidas 2 tareas para hoy"</b>
          La sheet se cierra al swipe down. La pantalla muestra Hoy 0/2 con las dos rows.
        </div>
        <div className="story-arrow">→</div>
        <div className="story-step">
          <small>0:28 · check</small>
          <b>Tap al checkbox de la primera</b>
          Modal "Registrar" con modificadores (normal / extra / parcial). Submit. <span style={{ color: 'var(--brand-amber)', fontWeight: 700 }}>+12 MP pendientes de verificación</span>.
        </div>
      </div>

      <h4>Lo que evita</h4>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, columns: 2, columnGap: 24 }}>
        <li>Ver "Recurrentes" antes de tener 1 tarea (paraliza al usuario nuevo).</li>
        <li>Tener que adivinar qué hace "+ Crear nueva" vs "+ Añadir tarea".</li>
        <li>Buscar el catálogo al final de la pantalla colapsado.</li>
        <li>Filtrar por categoría sin haber añadido aún ninguna tarea.</li>
        <li>Aprender un layout para Tareas y otro distinto para Actividades.</li>
        <li>Un toggle Lista/Semana que pisa la jerarquía de "¿qué hago hoy?".</li>
      </ul>
    </div>
  );
}

/* ============================================================ */
/* SPECS — uno por screen                                       */
/* ============================================================ */

function Spec({ name, route, states, components, decisions, interactions, pills }) {
  return (
    <div className="spec">
      <h4>{name}</h4>
      <span className="ruta">{route}</span>
      <div style={{ marginTop: 6 }}>
        {pills && pills.map((p, i) => (
          <span key={i} className={`pill ${p.tone || ''}`}>{p.label}</span>
        ))}
      </div>
      {states && (<>
        <h5>Estados cubiertos</h5>
        <ul>{states.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </>)}
      {components && (<>
        <h5>Componentes interiores</h5>
        <ul>{components.map((c, i) => <li key={i} dangerouslySetInnerHTML={{ __html: c }} />)}</ul>
      </>)}
      {interactions && (<>
        <h5>Interacciones · API</h5>
        <ul>{interactions.map((c, i) => <li key={i} dangerouslySetInnerHTML={{ __html: c }} />)}</ul>
      </>)}
      {decisions && (<>
        <h5>Decisiones tomadas</h5>
        <ul>{decisions.map((d, i) => <li key={i} dangerouslySetInnerHTML={{ __html: d }} />)}</ul>
      </>)}
    </div>
  );
}

/* ============================================================ */
/* APP                                                          */
/* ============================================================ */

function App() {
  return (
    <DesignCanvas
      title="15 · Tareas & Actividades · rediseño v2.2"
      subtitle="De 4 niveles de UI a 2. Tabs +MP/−MP. Catálogo en el flujo +. Verificación como banner. Simetría con Actividades."
    >
      <DCSection id="diagnostico" title="Diagnóstico & decisiones" subtitle="Lo que falla en producción y las 8 decisiones del handoff">
        <DCArtboard id="diag" label="Diagnóstico de niveles" width={460} height={760}>
          <PanelDiagnosis />
        </DCArtboard>
        <DCArtboard id="dec" label="8 decisiones · resueltas" width={460} height={760}>
          <PanelDecisions />
        </DCArtboard>
        <DCArtboard id="tabs" label="Top tabs +MP / −MP · anatomía" width={600} height={620}>
          <S08_TabsAnatomy />
        </DCArtboard>
      </DCSection>

      <DCSection id="tasks" title="Tareas · pantallas" subtitle="Vista principal con datos · empty &quot;todo al día&quot; · semana · sheet · banner verificación">
        <DCArtboard id="01-main" label="01 · Vista principal con datos" width={360} height={760}>
          <S01_TasksMain />
        </DCArtboard>
        <DCArtboard id="01-spec" label="Spec 01" width={360} height={760}>
          <Spec
            name="TasksHome — Vista principal"
            route="src/frontend/src/pages/Tasks.tsx"
            pills={[{ label: 'refactor', tone: 'amber' }, { label: '−2 niveles UI' }]}
            states={[
              '<b>3 tareas hoy + 2 esta semana</b> (mockup principal)',
              'Verificación pendiente: banner amber arriba',
              'Mezcla owner: "A ti" / "Blanca" en la misma lista',
            ]}
            components={[
              '<code>MPTabs</code> (top tabs +MP/−MP, sticky en scroll)',
              '<code>HeaderStrip</code>: segment Mías/Todas/Recurrentes + 📅 + Plus',
              '<code>VerifyBanner</code> condicional (canvas 05)',
              '<code>SectionH</code>: Hoy · Esta semana · Próximas',
              '<code>TaskRow</code>: checkbox + name + cat + owner + pts',
              'Footer link "Ver historial completo →"',
            ]}
            interactions={[
              '<b>Tap top tab</b> → navigate <code>/home/activities</code>',
              '<b>Tap segment</b> → setState filter, <code>localStorage.tasksFilter</code>',
              '<b>Tap 📅</b> → toggle view (lista/semana), <code>localStorage.tasksView</code>',
              '<b>Tap +</b> → open <code>AddTaskFromCatalogSheet</code>',
              '<b>Tap checkbox</b> → open <code>LogTaskModal</code> → <code>apiClient.tasks.logCompletion()</code>',
              '<b>Tap row body</b> → open task detail bottom sheet',
              '<b>Tap "Verificar"</b> → <code>apiClient.tasks.verifyLog(logId)</code>',
              '<b>Tap "Después"</b> → snooze 4h, banner reaparece tras ese tiempo',
            ]}
            decisions={[
              '<b>1 sola fila</b> de filtro (segment) tras los top tabs. Recurrentes vive como filtro.',
              'Saldo del usuario (1.240 MP) en chip pequeño top-right — eco del hero.',
              'Owner "A ti" / "Blanca" en meta · cero competición ("Tú vs Blanca" prohibido por canvas 13).',
              'Footer historial siempre visible si hay logs ≥ 1.',
            ]}
          />
        </DCArtboard>

        <DCArtboard id="02-empty" label="02 · Todo al día" width={360} height={760}>
          <S02_TasksAllDone />
        </DCArtboard>
        <DCArtboard id="02-spec" label="Spec 02" width={360} height={760}>
          <Spec
            name="TasksHome — Todo al día"
            route="src/frontend/src/pages/Tasks.tsx"
            pills={[{ label: 'empty cálido', tone: 'purple' }]}
            states={[
              'Hoy 3/3 hechas, ninguna pendiente, esta semana con 2',
              'Variante todo el día completado pero esta semana con tareas',
            ]}
            components={[
              '<code>SectionH</code> con count = total → renderiza badge ✓',
              'Hero card de cierre: ✨ + "+22 MP entre los dos" + lookahead a mañana',
              'Reusa <code>TaskRow.done</code> para mostrar las tachadas del día',
            ]}
            decisions={[
              '<b>UNA sola CTA secundaria</b> en el hero: "Mañana hay 2 más esperando" — es información, no botón.',
              'Sin emojis "🎉" ni confeti — es lo cotidiano (canvas 13).',
              'El "+22 MP entre los dos" usa <b>color success</b> para reforzar el modelo "los dos sumáis al mismo bote".',
              'Si no hay nada hoy ni esta semana → empty grande con CTA "📚 Elegir del catálogo".',
            ]}
          />
        </DCArtboard>

        <DCArtboard id="03-week" label="03 · Vista semana" width={360} height={760}>
          <S03_TasksWeek />
        </DCArtboard>
        <DCArtboard id="03-spec" label="Spec 03" width={360} height={760}>
          <Spec
            name="TasksHome — Vista semana"
            route="src/frontend/src/pages/Tasks.tsx (view='week')"
            pills={[{ label: 'sub-vista' }]}
            states={[
              'Lunes (hoy) marcado · 1 día con MP gasto previsto · 2 días sin nada',
              'Pip amber = tarea propia · pip morado = actividad confirmada · pip dual = ambos',
            ]}
            components={[
              '<code>WeekStrip</code>: 7 columnas, tap a una hace scroll al day-block',
              '<code>DayBlock</code>: cabecera con resumen (n/total · MP del día)',
              '<code>TaskRow</code> sin cambios — mismo componente que vista lista',
            ]}
            interactions={[
              '<b>Tap día</b> → scrollIntoView del DayBlock correspondiente · NO usar <code>scrollIntoView</code>, usar <code>scrollTop</code> manual',
              '<b>Swipe lateral en strip</b> → cambiar de semana, <code>weekStart</code> ±7d',
              '<b>Tap "Ver semana siguiente →"</b> → idem',
            ]}
            decisions={[
              'Mismo layout vertical que vista lista — solo cambia que ahora hay <b>cabeceras de día</b> en lugar de "Hoy / Esta semana".',
              'No añadir columnas tipo Kanban — desktop puede, mobile no (390px).',
              'WeekStrip pegajoso al hacer scroll para que el contexto temporal nunca se pierda.',
            ]}
          />
        </DCArtboard>

        <DCArtboard id="04-sheet" label="04 · Sheet + Tarea" width={360} height={760}>
          <S04_AddTaskSheet />
        </DCArtboard>
        <DCArtboard id="04-spec" label="Spec 04" width={360} height={760}>
          <Spec
            name="AddTaskSheet — Catálogo + Crear"
            route="src/frontend/src/components/v2/tasks/AddTaskFromCatalogSheet.tsx"
            pills={[{ label: 'fusión 2→1', tone: 'amber' }]}
            states={[
              'Tab "Del catálogo" (default) · 40 ideas en 9 categorías',
              'Tab "Crear nueva" → form: nombre / categoría / puntos / recurrencia',
              'Estado "ya añadida" (chip ✓ purple en lugar de + verde)',
              'Estado vacío de búsqueda · estado sin resultados',
            ]}
            components={[
              '<code>SheetTabs</code>: 2 pestañas, default catálogo',
              '<code>SearchInput</code> + <code>CategoryChips</code>',
              '<code>CatalogGroup</code> + <code>CatalogRow</code>',
              'Footer fijo: "Listo (3 añadidas)" cuando hay añadidas',
            ]}
            interactions={[
              '<b>Tap +</b> en row → <code>POST /api/tasks</code> con <code>{ name, category, pointsBase, scheduledFor: null }</code>',
              '<b>Tap fila ya añadida</b> → no-op, se ve estado "✓ añadida"',
              '<b>Swipe down sheet</b> → close, mantiene cambios',
              '<b>Tap "Crear nueva"</b> → form expanded · botón footer pasa a "Crear tarea"',
            ]}
            decisions={[
              '<b>Catálogo en flujo +</b>, no acordeón al fondo. Elimina el botón "Ver catálogo".',
              'Default = catálogo. <b>Crear nueva</b> es escape, no front door.',
              'No cierra automáticamente al añadir 1 — el usuario casi siempre añade 2-3 de tirón.',
              'Añade chip "✓ ya en lista" en filas ya activas para evitar duplicados (pero permite tap).',
            ]}
          />
        </DCArtboard>

        <DCArtboard id="05-verify" label="05 · Banner verificar" width={360} height={760}>
          <S05_VerifyBanner />
        </DCArtboard>
        <DCArtboard id="05-spec" label="Spec 05" width={360} height={760}>
          <Spec
            name="VerifyBanner — condicional"
            route="src/frontend/src/components/v2/tasks/VerifyBanner.tsx <small>(nuevo)</small>"
            pills={[{ label: 'sustituye tab', tone: 'amber' }]}
            states={[
              '1 verificación: card completa con CTA',
              '2+ verificaciones: card de la 1ª + chip "+1 más esperando · ver todas →"',
              '0 verificaciones: <b>no se renderiza nada</b> (0px)',
              'Snooze: oculto 4h, vuelve después',
            ]}
            components={[
              '<code>VerifyCard</code> (icono 👀 + texto + 2 botones)',
              '<code>VerifyChain</code> chip cuando hay más de 1',
            ]}
            interactions={[
              '<b>Tap ✓ Verificar</b> → <code>apiClient.tasks.verifyLog(logId)</code> + toast success',
              '<b>Tap Después</b> → <code>localStorage.verifySnoozeUntil = now+4h</code>',
              '<b>Tap "ver todas"</b> → <code>nav("/home/tasks/verify-queue")</code> (ruta nueva, dedicada)',
              'Hook: <code>useTasks().partnerPendingLogs</code> ya existe — solo cambia render',
            ]}
            decisions={[
              '<b>Tab fija eliminada</b>. La tab de "Verificar" estaba vacía 80% del tiempo.',
              'Banner ocupa 0px si no hay nada — no penaliza el flujo principal.',
              'Si hay 5+ verificaciones, llevar a queue dedicada (no inflar la home).',
              'Copy: "Blanca ha completado X. ¿Confirmas?" — jamás "Aprueba" o "Acepta" (paternalista).',
            ]}
          />
        </DCArtboard>
      </DCSection>

      <DCSection id="activities" title="Actividades · simetría" subtitle="Mismo layout que Tareas. Lo único que cambia: signo, color, semántica de catálogo (plantillas).">
        <DCArtboard id="06-act" label="06 · Activas" width={360} height={760}>
          <S06_Activities />
        </DCArtboard>
        <DCArtboard id="06-spec" label="Spec 06" width={360} height={760}>
          <Spec
            name="ActivitiesHome — Activas"
            route="src/frontend/src/pages/Activities.tsx"
            pills={[{ label: 'simétrico a Tasks', tone: 'purple' }]}
            states={[
              '1 pendiente de tu respuesta + 1 confirmada',
              '0 activas → empty con CTA "Proponer actividad"',
              'Solo confirmadas → no hay sección "Pendientes"',
            ]}
            components={[
              '<code>MPTabs</code> con activities seleccionada',
              '<code>HeaderStrip onSpend</code>: segment Activas/Plantillas/Catálogo',
              '<code>ActivityActionCard</code> (existe ya en v2)',
              '<code>ActivityWaitingCard</code> (existe ya en v2)',
            ]}
            interactions={[
              '<b>Tap "Aceptar"</b> → <code>apiClient.negotiations.respond(negId, "accepted")</code>',
              '<b>Tap "Negociar"</b> → <code>nav(`/home/activities/${eventId}`)</code>',
              '<b>Tap "Rechazar"</b> → modal de confirmación, luego <code>respond("rejected")</code>',
              '<b>Tap +</b> → <code>nav("/request-activity")</code> (wizard existente)',
            ]}
            decisions={[
              '<b>Las tabs internas de Actividades pasan de 3 a 3 idénticas a Tareas</b>: Activas / Plantillas / Catálogo.',
              '"Plantillas" reemplaza a "Recurrentes" en Actividades — más fiel al modelo (templates personalizadas).',
              'Catálogo se mantiene como tab (no en sheet) porque la creación de actividad es <b>negociada</b>: necesita más contexto que añadir tarea.',
              'No hay "Verificar" en actividades — la confirmación es síncrona vía negociación.',
            ]}
          />
        </DCArtboard>

        <DCArtboard id="07-cat" label="07 · Catálogo Actividades" width={360} height={760}>
          <S07_ActivitiesCatalog />
        </DCArtboard>
        <DCArtboard id="07-spec" label="Spec 07" width={360} height={760}>
          <Spec
            name="ActivitiesHome — Catálogo"
            route="src/frontend/src/components/v2/catalog/ActivityCatalogManager.tsx"
            pills={[{ label: 'mantiene v2.1.1' }]}
            states={[
              '~50 plantillas globales agrupadas por categoría',
              'Filtro por chips · búsqueda',
              'Plantillas custom de pareja al final con badge',
            ]}
            components={[
              '<code>ActivityCatalogManager</code> (existe)',
              '<code>ActivityCatalogPicker</code> al tap +',
            ]}
            interactions={[
              '<b>Tap +</b> en row → <code>nav(`/request-activity?templateId=${id}`)</code> con plantilla pre-seleccionada',
              '<b>Tap "+ plantilla nueva"</b> → <code>AddActivityTemplateSheet</code> (existe)',
            ]}
            decisions={[
              'Mantener tab Catálogo separada en Actividades es <b>excepción consciente</b> — actividades son colaborativas, requieren plantillas más ricas.',
              'Tareas van por sheet porque son add-and-go. Actividades por tab porque son explorar-y-proponer.',
              '<b>Esta es la única asimetría</b> entre Tareas/Actividades, y se justifica por el modelo de negociación.',
            ]}
          />
        </DCArtboard>
      </DCSection>

      <DCSection id="storyboard" title="Storyboard · primera tarea" subtitle="Recorrido del usuario nuevo · 28 segundos · 0 tabs apilados">
        <DCArtboard id="story" label="Recorrido completo" width={980} height={420}>
          <PanelStoryboard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
