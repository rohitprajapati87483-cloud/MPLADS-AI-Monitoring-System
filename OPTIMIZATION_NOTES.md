# MPLADS dataset processing optimization

Applied fixes:
- Replaced repeated column profiling scans with a single-pass profiler.
- Replaced multi-pass validation with one main row pass plus one IQR sort.
- Removed duplicate scanning from cleaning suggestions; duplicateDetector is the single duplicate-analysis stage.
- Replaced duplicate detector with O(n) Map-based grouping and removed per-row word sorting.
- Added browser yields between expensive pipeline stages so React can paint the loading state.
- Data preview is paginated to 20 rows and uses React useDeferredValue for search responsiveness.
- TypeScript 6 deprecation configuration retained.

Validation performed:
- TypeScript project build (`tsc -b`) passes on the supplied TypeScript 6.x toolchain.
- Vite bundle could not be executed in the supplied archive because its bundled optional native Rolldown binding is missing. After a normal dependency install (`npm install`), run `npm run build`.
