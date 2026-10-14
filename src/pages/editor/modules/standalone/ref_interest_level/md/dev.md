Input	Expected Output	Reasoning
[4■■, 6■■, 7■■, 8■■, 10■■]	4–10■■	All citations have OUTSTANDING (■■), so they merge into a range.
[4■, 6■■, 7■, 8■■, 10■]	4, 7, 10■ and 6, 8■■	Different interest levels (■ and ■■), so they merge separately.
[3■, 4■, 5■, 7■, 9■]	3–5, 7, 9■	Continuous ■ merge, while non-continuous numbers remain separate.
[2■■, 3■■, 5■■, 6■■, 8■■]	2–3, 5–6, 8■■	Separate ranges for non-continuous ■■ values.
[1■, 3■■, 4■■, 5■■, 7■]	1, 7■ and 3–5■■	Merging separate ■ and ■■ levels.
[10■■, 11■■, 12■■, 15■■, 17■■, 18■■]	10–12, 15, 17–18■■	Merging consecutive ■■, keeping gaps separate.
[2■, 3■, 5■, 6■, 8■, 10■]	2–3, 5–6, 8, 10■	Separating and merging non-continuous ■ values.
[1■, 2■■, 3■■, 4■, 5■, 6■■, 7■■, 8■■]	1, 4–5■ and 2–3, 6–8■■	Grouping separately based on levels.