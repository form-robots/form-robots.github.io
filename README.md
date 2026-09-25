# form-robots.github.io

Project page for **FORM: Robot Manipulation through Direct Material Law Identification**, served at <https://form-robots.github.io/>.

Plain HTML, CSS, and a little JavaScript, with no build step. GitHub Pages publishes the `main` branch as is.

- Preview locally: `python3 -m http.server 8000`, then open <http://localhost:8000>.
- Media: `tools/make_media.sh path/to/FORM` rebuilds `media/` and the social card from the FORM repository (needs ffmpeg with libx264, and Python with Pillow).
- Equations: `npm install mathjax-full@3`, then `NODE_PATH=./node_modules node tools/render_math.js` rewrites `assets/math/*.svg` and prints each equation's width in em for `index.html`.
- When the arXiv version is out, point the Paper button in `index.html` at it and add the eprint to the BibTeX entry.
