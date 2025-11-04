SVG Rename + Adobe Stock CSV — ONLINE
====================================
Static web app (no server). Works in your browser:
- Load SVGs via folder picker
- Optional mapping CSV (old,new/title)
- Exports:
  * adobe_stock_export.csv (asset_id, filename, title, keywords, sha256_bin, sha256_svg_norm)
  * renamed_svgs.zip (renamed files + optional <title> and asset_id in <metadata>)
- Keyword booster with packs + seeds + dedupe + plural merge.

How to host
-----------
- GitHub Pages: push index.html and enable Pages on the repo
- Vercel/Netlify: drag-drop the folder or deploy as static site
- Local: double-click index.html

Notes
-----
- Browsers cannot rename files on your disk. The app creates a ZIP with renamed copies.
- phash is not included in the online version (kept lightweight).

