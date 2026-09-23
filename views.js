import { CONFIG, money, number, dateLabel, dateTimeLabel, periodLabel, nextPeriod } from "./config.js";
import { Store } from "./store.js";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
const rows = (name, period) => Store.list(name, period);

export const formSchema = {
  cash: [
    ["date","Fecha","date"],
    ["branch","Sucursal","select",CONFIG.branches],
    ["type","Tipo","select",[["income","Ingreso"],["expense","Egreso"]]],
    ["concept","Concepto","text"],
    ["amount","Importe","number"],
    ["notes","Observaciones","textarea"]
  ],

  provider: [
    ["name","Proveedor","text"],
    ["taxId","CUIT","text"],
    ["phone","Teléfono","text"],
    ["email","Email","email"],
    ["notes","Observaciones","textarea"]
  ],

  invoice: [
    ["provider","Proveedor","text"],
    ["number","N° de factura","text"],
    ["date","Fecha","date"],
    ["dueDate","Vencimiento","date"],
    ["branch","Sucursal","select",CONFIG.branches],
    ["amount","Importe","number"],
    ["status","Estado","select",[["pending","Pendiente"],["paid","Pagada"],["partial","Parcial"]]],
    ["notes","Observaciones","textarea"]
  ],

  employee: [
    ["name","Nombre completo","text"],
    ["branch","Sucursal","select",CONFIG.branches],
    ["role","Puesto","text"],
    ["phone","Teléfono","text"],
    ["active","Activo","select",[["true","Sí"],["false","No"]]]
  ],

  hours: [
    ["employee","Empleado","text"],
    ["date","Fecha","date"],
    ["hours","Horas","number"],
    ["notes","Observaciones","textarea"]
  ]
};

function kpi(label, value, hint, cls = "") {
  return `<article class="kpi ${cls}">
    <span>${label}</span>
    <strong>${value}</strong>
    <small>${hint || ""}</small>
  </article>`;
}

function table(headers, body, empty = "No hay registros para mostrar.") {
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${body || `<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

function actions(collection, id, editType = collection) {
  const editButton =
    '<button data-edit="' +
    esc(editType) +
    '" data-id="' +
    esc(id) +
    '">Editar</button>';

  const deleteButton =
    '<button class="danger-link" data-delete="' +
    esc(collection) +
    '" data-id="' +
    esc(id) +
    '">Dar de baja</button>';

  return '<div class="row-actions">' +
    editButton +
    deleteButton +
    '</div>';
}

export function renderDashboard(content, period) {
  const cash = rows("cash", period);
  const invoices = rows("invoices", period);

  const income = cash
    .filter(x => x.type === "income")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const expense = cash
    .filter(x => x.type === "expense")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const invoiced = invoices
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const pending = invoices
    .filter(x => x.status !== "paid")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const balance = income - expense;

  const hours = rows("hours", period)
    .reduce((s, x) => s + Number(x.hours || 0), 0);

  const recent = [...Store.db.audit].slice(0, 8);

  content.innerHTML = `
    <section class="hero">
      <div>
        <span class="hero-tag">CONTROL EMPRESARIAL</span>
        <h2>Todo Blunno, en un solo lugar.</h2>
        <p>
          Controlá caja, facturas, proveedores, personal y resultados
          sin perder la historia de ningún cambio.
        </p>
      </div>

      <img src="distri.jpeg" alt="Distribuidora Blunno">
    </section>

    <div class="kpi-grid">

      ${kpi(
        "Resultado de caja",
        money(balance),
        balance >= 0
          ? "Saldo positivo del período"
          : "Saldo negativo del período",
        balance >= 0 ? "positive" : "negative"
      )}

      ${kpi(
        "Ingresos",
        money(income),
        `${cash.filter(x => x.type === "income").length} movimientos`
      )}

      ${kpi(
        "Egresos",
        money(expense),
        `${cash.filter(x => x.type === "expense").length} movimientos`
      )}

      ${kpi(
        "Facturado",
        money(invoiced),
        `${invoices.length} facturas`
      )}

      ${kpi(
        "Pendiente",
        money(pending),
        "Facturas no pagadas",
        pending > 0 ? "warning" : "positive"
      )}

      ${kpi(
        "Horas Bodereau",
        number(hours),
        "Horas cargadas"
      )}

    </div>

    <div class="grid-2">

      <section class="panel">

        <div class="panel-head">
          <div>
            <span class="section-kicker">ACTIVIDAD</span>
            <h3>Últimos cambios</h3>
          </div>

          <button
            class="text-button"
            data-view-jump="history">
            Ver historial
          </button>
        </div>

        ${
          recent.length
            ? recent.map(a => `
                <div class="activity">
                  <div class="activity-dot"></div>

                  <div>
                    <b>${esc(a.action)}</b>
                    <span>
                      ${esc(a.collection)} · ${dateTimeLabel(a.at)}
                    </span>
                  </div>
                </div>
              `).join("")
            : `
              <div class="empty-block">
                Todavía no hay movimientos auditados.
              </div>
            `
        }

      </section>

      <section class="panel">

        <div class="panel-head">
          <div>
            <span class="section-kicker">SUCURSALES</span>
            <h3>Estado operativo</h3>
          </div>
        </div>

        ${CONFIG.branches.map(b => `
          <div class="branch-row">

            <div>
              <b>${b}</b>
              <span>
                Movimientos de caja:
                ${cash.filter(x => x.branch === b).length}
              </span>
            </div>

            <span class="status-pill">ACTIVA</span>

          </div>
        `).join("")}

      </section>

    </div>
  `;
}

export function renderCash(content, period) {

  const data = rows("cash", period)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const income = data
    .filter(x => x.type === "income")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const expense = data
    .filter(x => x.type === "expense")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">CONTROL DIARIO</span>
        <h2>Caja diaria</h2>
        <p>
          Cada ingreso y egreso queda asociado al período,
          sucursal y usuario.
        </p>
      </div>

      <button class="primary-button" data-new="cash">
        ＋ Nuevo movimiento
      </button>

    </div>

    <div class="mini-kpis">

      ${kpi("Ingresos", money(income), "")}

      ${kpi("Egresos", money(expense), "")}

      ${kpi("Neto", money(income - expense), "")}

    </div>

    ${table(
      [
        "Fecha",
        "Sucursal",
        "Tipo",
        "Concepto",
        "Importe",
        "Acciones"
      ],

      data.map(x => `
        <tr>

          <td>${dateLabel(x.date)}</td>

          <td>${esc(x.branch)}</td>

          <td>
            <span class="type ${x.type}">
              ${x.type === "income" ? "Ingreso" : "Egreso"}
            </span>
          </td>

          <td>${esc(x.concept)}</td>

          <td class="amount">
            ${money(x.amount)}
          </td>

          <td>
            ${actions("cash", x.id)}
          </td>

        </tr>
      `).join("")
    )}

  `;
}

export function renderProviders(content) {

  const data = rows("providers");

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">MAESTRO PERMANENTE</span>
        <h2>Proveedores</h2>
        <p>
          Los proveedores no se eliminan al cambiar de mes.
          Se pueden dar de baja y recuperar.
        </p>
      </div>

      <button class="primary-button" data-new="provider">
        ＋ Nuevo proveedor
      </button>

    </div>

    ${table(
      [
        "Proveedor",
        "CUIT",
        "Teléfono",
        "Estado",
        "Acciones"
      ],

      data.map(x => `
        <tr>

          <td>
            <b>${esc(x.name)}</b>
          </td>

          <td>${esc(x.taxId)}</td>

          <td>${esc(x.phone)}</td>

          <td>
            <span class="status-pill ${x.active === false ? "muted" : ""}">
              ${x.active === false ? "INACTIVO" : "ACTIVO"}
            </span>
          </td>

          <td>
            ${actions("providers", x.id, "provider")}
          </td>

        </tr>
      `).join("")
    )}

  `;
}

export function renderInvoices(content, period) {

  const data = rows("invoices", period)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const total = data
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const pending = data
    .filter(x => x.status !== "paid")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">CUENTAS A PAGAR</span>
        <h2>Facturas</h2>
        <p>
          Importes iguales no se consideran duplicados.
          El control se realiza por identificación de factura.
        </p>
      </div>

      <button class="primary-button" data-new="invoice">
        ＋ Nueva factura
      </button>

    </div>

    <div class="mini-kpis">

      ${kpi("Facturado", money(total), "")}

      ${kpi("Pendiente", money(pending), "")}

      ${kpi("Documentos", data.length, "")}

    </div>

    ${table(
      [
        "Proveedor",
        "Factura",
        "Fecha",
        "Vencimiento",
        "Sucursal",
        "Importe",
        "Estado",
        "Acciones"
      ],

      data.map(x => `
        <tr>

          <td>
            <b>${esc(x.provider)}</b>
          </td>

          <td>${esc(x.number)}</td>

          <td>${dateLabel(x.date)}</td>

          <td>${dateLabel(x.dueDate)}</td>

          <td>${esc(x.branch)}</td>

          <td class="amount">
            ${money(x.amount)}
          </td>

          <td>

            <span class="status-pill ${
              x.status === "paid"
                ? "success"
                : x.status === "partial"
                  ? "warning"
                  : "danger"
            }">

              ${
                x.status === "paid"
                  ? "PAGADA"
                  : x.status === "partial"
                    ? "PARCIAL"
                    : "PENDIENTE"
              }

            </span>

          </td>

          <td>
            ${actions("invoices", x.id)}
          </td>

        </tr>
      `).join("")
    )}

  `;
}

export function renderPeople(content) {

  const data = rows("employees");

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">PERSONAL</span>
        <h2>Empleados</h2>
        <p>
          La ficha permanece como maestro histórico.
          La baja no destruye la información anterior.
        </p>
      </div>

      <button class="primary-button" data-new="employee">
        ＋ Nuevo empleado
      </button>

    </div>

    ${table(
      [
        "Nombre",
        "Sucursal",
        "Puesto",
        "Teléfono",
        "Estado",
        "Acciones"
      ],

      data.map(x => `
        <tr>

          <td>
            <b>${esc(x.name)}</b>
          </td>

          <td>${esc(x.branch)}</td>

          <td>${esc(x.role)}</td>

          <td>${esc(x.phone)}</td>

          <td>
            <span class="status-pill ${x.active === false ? "muted" : ""}">
              ${x.active === false ? "INACTIVO" : "ACTIVO"}
            </span>
          </td>

          <td>
            ${actions("employees", x.id, "employee")}
          </td>

        </tr>
      `).join("")
    )}

  `;
}

export function renderHours(content, period) {

  const data = rows("hours", period)
    .filter(x => x.branch ? x.branch === "Bodereau" : true);

  const total = data
    .reduce((s, x) => s + Number(x.hours || 0), 0);

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">CONTROL DE HORAS</span>
        <h2>Horas · Bodereau</h2>
        <p>
          Este módulo está limitado a la sucursal Bodereau,
          como definimos para el sistema.
        </p>
      </div>

      <button class="primary-button" data-new="hours">
        ＋ Cargar horas
      </button>

    </div>

    <div class="mini-kpis">

      ${kpi("Horas del mes", number(total), "")}

      ${kpi("Registros", data.length, "")}

    </div>

    ${table(
      [
        "Fecha",
        "Empleado",
        "Horas",
        "Observaciones",
        "Acciones"
      ],

      data.map(x => `
        <tr>

          <td>${dateLabel(x.date)}</td>

          <td>
            <b>${esc(x.employee)}</b>
          </td>

          <td>${number(x.hours)}</td>

          <td>${esc(x.notes)}</td>

          <td>
            ${actions("hours", x.id)}
          </td>

        </tr>
      `).join("")
    )}

  `;
}

export function renderResults(content, period) {

  const cash = rows("cash", period);
  const inv = rows("invoices", period);

  const income = cash
    .filter(x => x.type === "income")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const expense = cash
    .filter(x => x.type === "expense")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const invoiced = inv
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const paid = inv
    .filter(x => x.status === "paid")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const pending = invoiced - paid;
  const result = income - expense;

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">ANÁLISIS</span>
        <h2>Resultados</h2>
        <p>
          Lectura separada de caja, facturación y pendientes
          para no mezclar conceptos.
        </p>
      </div>

    </div>

    <div class="result-grid">

      <div class="result-card">
        <span>Resultado de caja</span>
        <strong class="${result >= 0 ? "good" : "bad"}">
          ${money(result)}
        </strong>
        <p>Ingresos menos egresos registrados.</p>
      </div>

      <div class="result-card">
        <span>Facturación</span>
        <strong>${money(invoiced)}</strong>
        <p>Total de facturas del período.</p>
      </div>

      <div class="result-card">
        <span>Pagado a proveedores</span>
        <strong>${money(paid)}</strong>
        <p>Facturas marcadas como pagadas.</p>
      </div>

      <div class="result-card">
        <span>Por pagar</span>
        <strong class="warn">${money(pending)}</strong>
        <p>
          Facturación no marcada como totalmente pagada.
        </p>
      </div>

    </div>
  `;
}

export function renderCompare(content, period) {

  const [y, m] = period.split("-").map(Number);

  const prev = `${m === 1 ? y - 1 : y}-${
    String(m === 1 ? 12 : m - 1).padStart(2, "0")
  }`;

  const calc = p => {

    const cash = rows("cash", p);
    const inv = rows("invoices", p);

    const income = cash
      .filter(x => x.type === "income")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const expense = cash
      .filter(x => x.type === "expense")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    return {
      income,
      expense,
      result: income - expense,
      invoices: inv.reduce(
        (s, x) => s + Number(x.amount || 0),
        0
      ),
      docs: inv.length
    };
  };

  const a = calc(prev);
  const b = calc(period);

  const diff = (x, y) => y - x;

  const pct = (x, y) =>
    x === 0
      ? (y === 0 ? 0 : 100)
      : ((y - x) / Math.abs(x)) * 100;

  const line = (label, x, y) => `
    <tr>

      <td>
        <b>${label}</b>
      </td>

      <td>
        ${
          typeof x === "number" && label !== "Facturas"
            ? money(x)
            : number(x)
        }
      </td>

      <td>
        ${
          typeof y === "number" && label !== "Facturas"
            ? money(y)
            : number(y)
        }
      </td>

      <td>
        ${
          typeof y === "number"
            ? (
                label === "Facturas"
                  ? number(diff(x, y))
                  : money(diff(x, y))
              )
            : ""
        }
      </td>

      <td>
        ${pct(x, y).toFixed(1)}%
      </td>

    </tr>
  `;

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">EVOLUCIÓN</span>

        <h2>Comparativa mensual</h2>

        <p>
          ${periodLabel(prev)} vs. ${periodLabel(period)}.
          Los períodos se mantienen separados.
        </p>
      </div>

    </div>

    ${table(
      [
        "Indicador",
        periodLabel(prev),
        periodLabel(period),
        "Diferencia",
        "Variación"
      ],

      [
        line("Ingresos", a.income, b.income),
        line("Egresos", a.expense, b.expense),
        line("Resultado", a.result, b.result),
        line("Facturación", a.invoices, b.invoices),
        line("Facturas", a.docs, b.docs)
      ].join("")
    )}

  `;
}

export function renderHistory(content) {

  const data = Store.db.audit;

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">AUDITORÍA</span>
        <h2>Historial de cambios</h2>
        <p>
          Registro cronológico de altas, ediciones, bajas,
          recuperaciones y cierres.
        </p>
      </div>

      <button class="secondary-button" id="exportAudit">
        Exportar historial
      </button>

    </div>

    ${table(
      [
        "Fecha",
        "Acción",
        "Sección",
        "Registro",
        "Usuario",
        "Motivo"
      ],

      data.map(x => `
        <tr>

          <td>${dateTimeLabel(x.at)}</td>

          <td>
            <span class="audit-action">
              ${esc(x.action)}
            </span>
          </td>

          <td>${esc(x.collection)}</td>

          <td class="mono">
            ${esc(x.recordId)}
          </td>

          <td>${esc(x.actor)}</td>

          <td>${esc(x.reason)}</td>

        </tr>
      `).join(""),

      "No hay movimientos auditados todavía."
    )}

  `;
}

export function renderImport(content) {

  content.innerHTML = `
    <div class="page-intro">

      <div>
        <span class="section-kicker">CARGA CONTROLADA</span>
        <h2>Importar / Exportar</h2>
        <p>
          Subí tus Excel, revisá los datos antes de guardarlos
          y conservá el registro de cada importación.
        </p>
      </div>

    </div>

    <div class="import-grid">

      <section class="panel import-panel">

        <span class="section-kicker">
          IMPORTAR EXCEL
        </span>

        <h3>Cargar información</h3>

        <p>
          El lector detecta hojas y columnas,
          propone un tipo de dato y muestra una vista
          previa antes de importar.
        </p>

        <input
          id="excelInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="file-input"
        >

        <div id="importPreview"></div>

      </section>

      <section class="panel">

        <span class="section-kicker">
          RESPALDO
        </span>

        <h3>Copias de seguridad</h3>

        <p>
          Descargá una copia completa de los datos actuales
          antes de cambios importantes.
        </p>

        <button class="secondary-button" id="backupButton">
          Descargar backup JSON
        </button>

        <button class="secondary-button" id="printButton">
          Imprimir informe
        </button>

      </section>

    </div>

    <section class="panel">

      <span class="section-kicker">
        REGLA DE SEGURIDAD
      </span>

      <h3>
        El Excel no pisa datos automáticamente
      </h3>

      <p>
        Cada importación debe pasar por lectura,
        validación y confirmación. Los importes repetidos
        son válidos; se revisan posibles duplicados por
        identificación de documento, no por importe.
      </p>

    </section>
  `;
}

export function renderPeriodModal() {

  const periods = Store.db.periods
    .sort((a, b) =>
      String(b.id).localeCompare(String(a.id))
    );

  return periods;
}

export function renderView(view, content, period) {

  if (view === "dashboard") {
    renderDashboard(content, period);

  } else if (view === "cash") {
    renderCash(content, period);

  } else if (view === "providers") {
    renderProviders(content);

  } else if (view === "invoices") {
    renderInvoices(content, period);

  } else if (view === "people") {
    renderPeople(content);

  } else if (view === "hours") {
    renderHours(content, period);

  } else if (view === "results") {
    renderResults(content, period);

  } else if (view === "compare") {
    renderCompare(content, period);

  } else if (view === "history") {
    renderHistory(content);

  } else {
    renderImport(content);
  }
}
