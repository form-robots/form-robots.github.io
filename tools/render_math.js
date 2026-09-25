// Render the page's equations to standalone SVG files in assets/math/.
//
//   npm install mathjax-full@3
//   NODE_PATH=./node_modules node tools/render_math.js
//
// Prints the width (em) to use on each <img class="eq">, so math matches the text size.
const fs = require("fs");
const path = require("path");
const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");

const INK = "#21333e";
const theta = (s) => `\\textcolor[RGB]{22,123,118}{${s}}`;
const data = (s) => `\\textcolor[RGB]{201,105,50}{${s}}`;
const faded = (s) => `\\textcolor[RGB]{138,153,164}{${s}}`;

const EQUATIONS = {
  weak: String.raw`\int_\Omega \tau(${theta("\\theta")}) : D[\psi_j]\,d\Omega
    \;-\; ${faded(String.raw`\underbrace{\int_\Omega p\,\nabla\!\cdot\psi_j\,d\Omega}_{=\,0\ \text{when}\ \nabla\cdot\psi_j\,=\,0}`)}
    \;=\; ${data(String.raw`\int_\Omega \rho\,(g-a)\cdot\psi_j\,d\Omega`)}`,
  time: String.raw`\begin{gathered}
    w_j(x,t)=\chi_j(t)\,\psi_j(x),\qquad \chi_j(0)=\chi_j(T)=0\\[2pt]
    -\int_0^T\!\sum_p m_p\,a_p\cdot w_j\,dt \;=\; \int_0^T\!\sum_p m_p\,v_p\cdot\dot w_{jp}\,dt
  \end{gathered}`,
  linear: String.raw`\begin{gathered}
    \tau(q;\theta)=\sum_{k=1}^{K}${theta("\\theta_k")}\,T_k(q)\\[4pt]
    \hat\theta=\arg\min_{\theta}\,\big\lVert A\,${theta("\\theta")}-${data("b")}\big\rVert_2^2
  \end{gathered}`,
  basis: String.raw`\begin{gathered}
    \psi_{i,d}(x)=N_i(x)\,e_d\\[2pt]
    \int_\Omega \sigma : D[\psi_{i,d}]\,d\Omega \;\approx\; \sum_p V_p\,e_d^{\mathsf T}\sigma_p\,\nabla N_i(x_p) \;=\; -e_d^{\mathsf T} f_i^{\mathrm{int}}
  \end{gathered}`,
  plan: String.raw`u^\star(${theta("\\hat\\theta")})\in\arg\min_{u\in\mathcal U}\;
    \mathcal J\big(\mathcal S_{${theta("\\hat\\theta")}}(x_0,u),\,\mathcal G\big)`,
};

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "local" }),
});

const out = path.join(__dirname, "..", "assets", "math");
fs.mkdirSync(out, { recursive: true });
for (const [name, tex] of Object.entries(EQUATIONS)) {
  const node = doc.convert(tex, { display: true, em: 16, ex: 8, containerWidth: 1600 });
  let svg = adaptor.innerHTML(node);
  const err = svg.match(/data-mjx-error="([^"]*)"/);
  if (err) throw new Error(`TeX error in ${name}: ${err[1]}`);
  // MathJax sizes in ex with ex = em / 2 here; convert to em for standalone files.
  const em = (attr) => Number(svg.match(new RegExp(`${attr}="([\\d.]+)ex"`))[1]) / 2;
  const width = em("width");
  const height = em("height");
  svg = svg
    .replace(/ width="[\d.]+ex"/, ` width="${width.toFixed(3)}em"`)
    .replace(/ height="[\d.]+ex"/, ` height="${height.toFixed(3)}em"`)
    .replace(/ style="[^"]*"/, "")
    .replace(/currentColor/g, INK);
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (svg.includes("xlink:href") && !svg.includes("xmlns:xlink")) {
    svg = svg.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  fs.writeFileSync(path.join(out, `${name}.svg`), svg + "\n");
  console.log(`${name}: width ${width.toFixed(2)}em, height ${height.toFixed(2)}em`);
}
