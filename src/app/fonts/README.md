# Fonts

These are stored with the code instead of loaded through `next/font/google`,
which downloads them from Google on every build. The cPanel host can't always
reach Google, and a build that fails partway takes the live site down.

Each file is the Latin subset Google Fonts serves for the weights used here,
byte for byte the same as what `next/font/google` used to download. All are
under the SIL Open Font License 1.1; see the OFL-*.txt file for each.

| File | Font | Weights |
| --- | --- | --- |
| inter-latin.woff2 | Inter | 100–900 (variable) |
| space-mono-latin-400.woff2 | Space Mono | 400 |
| space-mono-latin-700.woff2 | Space Mono | 700 |
| archivo-latin.woff2 | Archivo | 700–900 (variable) |
