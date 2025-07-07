const site = {
  title: "紧急飞毯",
  today: new Date(),
  cache: false,
  type: {
    "过了": "life",
    "尝了": "food",
    "去了": "event",
    "扫了": "novel",
    "读了": "book",
    "看了": "show",
    "玩了": "game",
  },
  rate: {
    "追读": "star-fill",
    "还想": "star-fill",
    "凑合": "star_half",
    "放弃": "star",
  },
  data: JSON.parse(localStorage.getItem("data")) || null,
  main: document.querySelector("main"),
};

function setTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches || (window.matchMedia("(hover: hover)").matches && (site.today.getHours() < 8 || site.today.getHours() > 18));
  if (localStorage.getItem("theme")) {
    document.documentElement.classList.toggle("dark", localStorage.theme === "dark");
  } else {
    document.documentElement.classList.toggle("dark", dark);
  }
  document.querySelector(".theme").addEventListener("click", () => {
    if (localStorage.getItem("theme")) {
      if (dark !== (localStorage.theme === "dark")) {
        localStorage.removeItem("theme");
      } else {
        localStorage.theme = dark ? "light" : "dark";
      }
    } else {
      localStorage.theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    }
    document.documentElement.classList.toggle("dark");
  });
}

async function fetchData() {
  const data_timestamp = +localStorage.getItem("data_timestamp");
  if (data_timestamp < Date.now() - 1000 * 60 * 60 * 24) {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("data")) {
        localStorage.removeItem(key);
      }
    });
    const order = Object.fromEntries(Object.keys(site.type).map((type, index) => [type, index]));
    const res = await fetch(`https://notion-api.splitbee.io/v1/table/1f687eb7522d8034a114c14834a8244c`);
    const raw = await res.json();
    raw.sort((x, y) => {
      const dateX = x.Date ? new Date(x.Date) : new Date(0);
      const dateY = y.Date ? new Date(y.Date) : new Date(0);
      const dateZ = dateY - dateX;
      if (dateZ !== 0) return dateZ;
      const typeX = x.Type ?? "";
      const typeY = y.Type ?? "";
      return (order[typeX] ?? Infinity) - (order[typeY] ?? Infinity);
    });
    site.data = {
      raw,
      list: [],
      date: {},
      type: {},
    };
    for (const item of raw) {
      const date = item.Date.replace(/-/g, "") || null;
      const type = item.Type || null;
      if (date) {
        (site.data.date[date] ??= []).push(raw.indexOf(item));
      }
      if (type) {
        (site.data.type[type] ??= []).push(raw.indexOf(item));
      }
    }
    site.data.list = Object.keys(site.data.date).reverse();
    localStorage.setItem("data", JSON.stringify(site.data));
    localStorage.setItem("data_timestamp", Date.now());
  }
  site.cache = true;
  return site.data;
}

async function fetchPage(id) {
  let data = JSON.parse(localStorage.getItem(`data_${id}`)) || null;
  if (!site.cache || !data) {
    const res = await fetch(`https://notion-api.splitbee.io/v1/page/${id}`);
    data = await res.json();
    localStorage.setItem(`data_${id}`, JSON.stringify(data));
  }
  return data;
}

function formatDate(date) {
  return date.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1/$2/$3");
}

function formatMeta(page) {
  let meta = "";
  if (page.Rate) {
    meta += `<span class="journal-rate" data-icon="${site.rate[page.Rate]}">${page.Rate}</span>`;
  }
  if (page.Tags) {
    meta += `<span data-icon="info"></span>` + page.Tags.map((tag) => `<span class="journal-tag">${tag}</span>`).join(" ");
  }
  if (page.Info && page.Type === "读了") {
    meta += `<span data-icon="info">${page.Info}</span>`;
  }
  return meta;
}

async function formatCalendar() {
  const data = await fetchData();

  const calEl = Object.assign(document.createElement("div"),      {className: "calendar"});
  const calElHead = Object.assign(document.createElement("div"),  {className: "calendar-head"});
  const calElDate = Object.assign(document.createElement("span"), {className: "calendar-date"});
  const calElPrev = Object.assign(document.createElement("a"),    {className: "calendar-prev"});
  const calElNext = Object.assign(document.createElement("a"),    {className: "calendar-next"});
  const calElBody = Object.assign(document.createElement("div"),  {className: "calendar-body"});
  calElPrev.addEventListener("click", () => { loadCal(-1) });
  calElNext.addEventListener("click", () => { loadCal( 1) });
  calElHead.append(calElDate, calElPrev, calElNext);
  calEl.append(calElHead, calElBody);

  const today = `${site.today.getFullYear()}${(site.today.getMonth() + 1).toString().padStart(2, "0")}${site.today.getDate().toString().padStart(2, "0")}`;
  let year = site.today.getFullYear();
  let month = site.today.getMonth();
  let start = data.list[data.list.length - 1];
  start = new Date(+start.slice(0, 4), +start.slice(4, 6) - 1, +start.slice(6, 8));

  function initCal(y, m) {
    calElDate.textContent = `${y} ${(m + 1).toString().padStart(2, "0")}`;
    calElBody.innerHTML = `<span class="calendar-week">Sun</span><span class="calendar-week">Mon</span><span class="calendar-week">Tue</span><span class="calendar-week">Wed</span><span class="calendar-week">Thu</span><span class="calendar-week">Fri</span><span class="calendar-week">Sat</span>`;
    const day1 = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate() + 1;
    for (let i = 0; i < day1; i++) {
      const span = document.createElement("span");
      span.className = "calendar-grid";
      calElBody.appendChild(span);
    }
    for (let d = 1; d < days; d++) {
      const date = `${y}${(m + 1).toString().padStart(2, "0")}${d.toString().padStart(2, "0")}`;
      const span = document.createElement("span");
      span.className = "calendar-grid";
      span.textContent = d.toString().padStart(2, "0");
      if (data.list.includes(date)) {
        span.innerHTML = `<a href="/log/${date}/">${d.toString().padStart(2, "0")}</a>`;
      }
      if (date === today) {
        span.classList.add("calendar-today");
      }
      calElBody.appendChild(span);
    }
    calElPrev.ariaDisabled = y <=      start.getFullYear() && m <=      start.getMonth();
    calElNext.ariaDisabled = y >= site.today.getFullYear() && m >= site.today.getMonth();
  }

  function loadCal(offset) {
    month += offset;
    if (month > 11) { month = 0;  year++; }
    if (month < 0)  { month = 11; year--; }
    initCal(year, month);
  }

  initCal(year, month);
  document.querySelector("article section").appendChild(calEl);
}

function renderHTML(raw) {
  const blocks = raw[Object.keys(raw)[0]].value?.content || [];

  function renderTitle(title) {
    return title
      .map(([t, d]) => {
        if (!d) return t;
        return d.reduce((text, deco) => {
          const [type, info] = deco;
          switch (type) {
            case "a":
              return `<a href="${info}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            case "b":
              return `<strong>${text}</strong>`;
            case "c":
              return `<code>${text}</code>`;
            case "i":
              return `<em>${text}</em>`;
            case "s":
              return `<del>${text}</del>`;
            default:
              return text;
          }
        }, t);
      }).join("");
  }

  function renderBlock(blocks, depth = 0) {
    let html = "";
    let listItem = [];
    let listType = null;
    let listNested = false;

    const renderList = () => {
      if (listItem.length === 0) return "";
      const t = listType === "numbered_list" ? "ol" : "ul";
      const h = listItem.join("");
      const c = listNested ? ` class="nested"` : "";
      listItem = [];
      return `<${t}${c}>${h}</${t}>`;
    };

    for (const id of blocks) {
      const block = raw[id]?.value;
      if (!block?.properties) continue;

      const type = block.type;
      const text = renderTitle(block.properties.title || []).replace(/::([a-z_]+)::/g, `<span data-icon="$1"></span>`);
      const children = block.content || [];
      const renderChildren = () => (children.length > 0 ? renderBlock(children, depth + 1) : "");

      if (["bulleted_list", "numbered_list", "to_do"].includes(type)) {
        if (listType !== type && listItem.length > 0) {
          html += renderList();
        }
        listType = type;
        let task = "";
        if (type === "to_do") {
          const checked = block.properties.checked?.[0][0] === "Yes";
          task = ` class="task${checked ? " task-checked" : ""}"`;
        }
        if (renderChildren) listNested = true;
        listItem.push(`<li${task}>${text}${renderChildren()}</li>`);
      } else {
        if (listItem.length > 0) {
          html += renderList();
        }

        switch (type) {
          case "text":
            html += `<p>${text}</p>`;
            break;
          case "header":
            html += `<h4>${text}</h4>`;
            break;
          case "sub_header":
            html += `<h5>${text}</h5>`;
            break;
          case "sub_sub_header":
            html += `<h6>${text}</h6>`;
            break;
          case "quote":
            html += `<blockquote>${text}</blockquote>`;
            break;
          case "code":
            html += `<pre><code>${text}</code></pre>`;
            break;
          case "callout":
            html += `<div class="callout">${text}</div>`;
            break;
          case "divider":
            html += `<hr />`;
            break;
          default:
            break;
        }

        if (children.length > 0) {
          html += renderChildren();
        }
      }
    }

    html += renderList();
    return html;
  }

  return renderBlock(blocks);
}

async function initPage() {
  if (!location.pathname.endsWith("/")) {
    history.replaceState(null, "", location.pathname + "/");
  }

  setTheme();

  const data = await fetchData();

  const fragment = new DocumentFragment();
  fragment.innerHTML = `<li><a href="/log/" data-type="log"><span class="font-num" data-name="记了">${data.list.length}</span></a></li>`;
  Object.entries(site.type).forEach(([type, slug]) => {
    if (data.type[type]) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/log/${slug}/`;
      link.dataset.type = slug;
      const span = document.createElement("span");
      span.dataset.name = type;
      span.className = "font-num";
      span.textContent = data.type[type].length || 0;

      link.appendChild(span);
      item.appendChild(link);
      fragment.appendChild(item);
    }
  });
  document.querySelector("header ul").appendChild(fragment);

  document.body.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && a.getAttribute("href")?.startsWith("/")) {
      e.preventDefault();
      site.main.ariaHidden = "true";
      document.body.classList.remove("side");
      setTimeout(() => {
        document.title.endsWith("迷路啦！") ? history.replaceState(null, "", a.getAttribute("href")) : history.pushState(null, "", a.getAttribute("href"));
        loadPage();
      }, 200);
    } else if (a && a.className === "reload") {
      a.ariaDisabled = "true";
      document.body.ariaHidden = "true";
      localStorage.removeItem("data_timestamp");
      const path = location.pathname.slice(5, -1);
      if (data.list.includes(path)) {
        data.date[path].forEach((index) => {
          localStorage.removeItem(`data_${data.raw[index].id}`);
        });
      }
      setTimeout(() => {
        if (document.title.endsWith("迷路啦！")) {
          location.pathname = "/";
        } else {
          location.reload();
        }
      }, 200);
    } else if (a && a.className === "menu") {
      document.body.classList.add("side");
    }
  });
  document.querySelector(".placeholder").addEventListener("click", () => {
    document.body.classList.remove("side");
  });
  window.addEventListener("popstate", () => {
    loadPage();
  });

  loadPage();
}

async function loadPage(path = location.pathname) {
  window.scrollTo(0, 0);
  document.querySelector("header [aria-disabled]")?.removeAttribute("aria-disabled");
  const data = await fetchData();
  let html = "";
  let title = site.title;

  if (path === "/") {
    html = `
      <article data-url="${path}">
        <section>
          <p>俊俊的</p>
          <p>${site.title}</p>
          <p><img src="/logo.gif" loading="lazy" onload="this.removeAttribute('onload')" /></p>
        </section>
      </article>
    `;
    formatCalendar();
  } else if (path === "/log/") {
    title += ` - LOG`;
    html = `
      <article data-url="${path}">
        <h2>记了 <span data-type="log"></span></h2>
        <ul class="journal-list">
          ${data.list.map((date) => `
            <li>
              <a href="/log/${date}/">
                <span class="font-num">${formatDate(date)}</span>
              </a>
              ${[...new Set(data.date[date].map((index) => data.raw[index].Type))].map((type) => 
                `<a href="/log/${site.type[type]}/" data-type="${site.type[type]}"></a>`
              ).join("")}
            </li>
          `).join("")}
        </ul>
      </article>
    `;
  } else if (path.startsWith("/log/") && path.endsWith("/")) {
    if (Object.values(site.type).includes(path.slice(5, -1))) {
      const slug = path.slice(5, -1);
      const type = Object.keys(site.type).find((key) => site.type[key] === slug);
      const items = data.type[type].map((index) => data.raw[index]);
      title += ` - #${slug[0].toUpperCase() + slug.slice(1)}`;
      if (["novel", "book", "show", "game"].includes(slug)) {
        html = `
          <article data-url="/log/cover/">
            <h2>${type} <span data-type="${slug}"></span></h2>
            <ul class="journal-list">
              ${items.map((item) => `
                <li>
                  <figure>
                    <img src="${item.Cover[0].url}" loading="lazy" onload="this.removeAttribute('onload')" />
                  </figure>
                  <figcaption>
                    <a href="/log/${item.Date.replace(/-/g, "")}/">${item.Name}</a>
                    <p class="journal-meta">${formatMeta(item)}</p>
                    <p class="journal-summary">${item.Summary || ""}</p>
                  </figcaption>
                </li>
              `).join("")}
            </ul>
          </article>
        `;
      } else {
        html = `
          <article data-url="${path}">
            <h2>${type} <span data-type="${slug}"></span></h2>
            <ul class="journal-list">
              ${items.map((item) => `
                <li>
                  <a href="/log/${item.Date.replace(/-/g, "")}/">
                    <span class="font-num">${item.Date.replace(/-/g, "/")}</span>
                    <span class="journal-title">${item.Name}</span>
                  </a>
                </li>
              `).join("")}
            </ul>
          </article>
        `;
      }
    } else if (data.list.includes(path.slice(5, -1))) {
      const date = path.slice(5, -1);
      const pages = await Promise.all(
        data.date[date].map(async (index) => {
          const item = data.raw[index];
          const page = await fetchPage(item.id);
          return {
            HTML: renderHTML(page),
            ...item,
          };
        })
      );
      const i = data.list.indexOf(date);
      const nav = [data.list[i + 1] || null, data.list[i - 1] || null];
      title += ` - ${formatDate(date)}`;
      html = `
        <article data-url="${path}">
          <h2>${formatDate(date)}</h2>
          ${pages.map((page) => `
            <section>
              <h3>
                ${page.Name}
                <a href="/log/${site.type[page.Type]}/" data-type="${site.type[page.Type]}"></a>
              </h3>
              ${page.Tags || page.Rate ? `<div class="journal-meta">${formatMeta(page)}</div>` : ""}
              ${page.Summary ? `<div class="journal-summary">${page.Summary}</div>` : ""}
              <div>${page.HTML}</div>
            </section>
          `).join("")}
        </article>
        <nav>
          ${nav[0] ? `<a rel="prev" href="/log/${nav[0]}/">${formatDate(nav[0])}</a>` : "<a></a>"}
          ${nav[1] ? `<a rel="next" href="/log/${nav[1]}/">${formatDate(nav[1])}</a>` : "<a></a>"}
        </nav>
      `;
    }
  } else {
    title += ` - 迷路啦！`;
    html = `
      <article data-url="/">
        <section>
          <p>${site.title}</p>
          <p>404</p>
          <p><img src="/logo.gif" loading="lazy" onload="this.removeAttribute('onload')" /></p>
        </section>
      </article>
    `;
    formatCalendar();
  }

  site.main.innerHTML = html;
  site.main.removeAttribute("aria-hidden");
  document.body.removeAttribute("aria-hidden");
  document.title = title;
  document.querySelector(`[href="${path}"]`)?.parentNode.setAttribute("aria-disabled", "true");
}

initPage();