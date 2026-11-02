// Rejestr aktywów One Eastside z Vantify (eksport Assets + Task Frequencies, 02/11/2026). Stałe dane.
// id = numer aktywa w Vantify; task = zadanie PPM w Vantify; freq = częstotliwości z Vantify;
// app = karty z listy PPM (ppm.js), które robią inspekcję tego aktywa. Puste app = tylko zlecenia Vantify (brak inspekcji w apce).
window.OEST_ASSETS = [
  {"id": 126461, "name": "Air Handling Units", "code": "", "kind": "hvac", "task": "Air Handling Units", "freq": ["6M", "12M"], "doc": "Job Sheet", "app": []},
  {"id": 127336, "name": "ATS (Evacuation Lift)", "code": "Evacuation Lift", "kind": "ats", "task": "Automatic Transfer Switches (Tower B, L12)", "freq": ["1M"], "doc": "", "app": ["EFA-INS-015"]},
  {"id": 127337, "name": "ATS (Firefighting Lift)", "code": "Firefighting Lift", "kind": "ats", "task": "Automatic Transfer Switches (Tower B, L13)", "freq": ["1M"], "doc": "", "app": ["EFA-INS-014"]},
  {"id": 127335, "name": "ATS (Remote Indicator Panel B)", "code": "Remote Indicator Panel B", "kind": "ats", "task": "Automatic Transfer Switches (Tower B, UG)", "freq": ["1M"], "doc": "", "app": ["EFA-INS-016"]},
  {"id": 127338, "name": "ATS (Smoke Extract Control Panel 01)", "code": "Smoke Extract Control Panel 01", "kind": "ats", "task": "Automatic Transfer Switches (Tower A, Roof 1)", "freq": ["1M"], "doc": "", "app": ["EFA-INS-018"]},
  {"id": 127339, "name": "ATS (Smoke Extract Control Panel 02)", "code": "Smoke Extract Control Panel 02", "kind": "ats", "task": "Automatic Transfer Switches (Tower B, Roof 2)", "freq": ["1M"], "doc": "", "app": ["EFA-INS-017"]},
  {"id": 126459, "name": "Distribution Board (DB-TB-EXT-1)", "code": "DB-TB-EXT-1", "kind": "db", "task": "Distribution Boards", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-DB-TB-EXT-1"]},
  {"id": 127321, "name": "Distribution Board (DB-TB-FFS-04)", "code": "DB-TB-FFS-04", "kind": "db", "task": "Distribution Boards (DB-TB-FFS-04)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-FFS-04"]},
  {"id": 127322, "name": "Distribution Board (DB-TB-FFS-12)", "code": "DB-TB-FFS-12", "kind": "db", "task": "Distribution Boards (DB-TB-FFS-12)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-FFS-12"]},
  {"id": 127323, "name": "Distribution Board (DB-TB-LL-02)", "code": "DB-TB-LL-02", "kind": "db", "task": "Distribution Boards (DB-TB-LL-02)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-02"]},
  {"id": 127324, "name": "Distribution Board (DB-TB-LL-06)", "code": "DB-TB-LL-06", "kind": "db", "task": "Distribution Boards (DB-TB-LL-06)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-06"]},
  {"id": 127325, "name": "Distribution Board (DB-TB-LL-10)", "code": "DB-TB-LL-10", "kind": "db", "task": "Distribution Boards (DB-TB-LL-10)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-10"]},
  {"id": 127326, "name": "Distribution Board (DB-TB-LL-14)", "code": "DB-TB-LL-14", "kind": "db", "task": "Distribution Boards (DB-TB-LL-14)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-14"]},
  {"id": 127319, "name": "Distribution Board (DB-TB-LL-LG)", "code": "DB-TB-LL-LG", "kind": "db", "task": "Distribution Boards (DB-TB-LL-LG)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-LG"]},
  {"id": 127320, "name": "Distribution Board (DB-TB-LL-UG)", "code": "DB-TB-LL-UG", "kind": "db", "task": "Distribution Boards (DB-TB-LL-UG)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-LL-UG"]},
  {"id": 127318, "name": "Distribution Board (DB-TB-PR-1)", "code": "DB-TB-PR-1", "kind": "db", "task": "Distribution Boards (DB-TB-PR-1)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-DB-TB-PR-1"]},
  {"id": 126460, "name": "Fan Coil Units", "code": "", "kind": "hvac", "task": "", "freq": [], "doc": "", "app": []},
  {"id": 127327, "name": "Multi-Service Distribution Board (MSDB-TB-01)", "code": "MSDB-TB-01", "kind": "db", "task": "Distribution Boards (MSDB-TB-01)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-01"]},
  {"id": 127328, "name": "Multi-Service Distribution Board (MSDB-TB-03)", "code": "MSDB-TB-03", "kind": "db", "task": "Distribution Boards (MSDB-TB-03)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-03"]},
  {"id": 127329, "name": "Multi-Service Distribution Board (MSDB-TB-05)", "code": "MSDB-TB-05", "kind": "db", "task": "Distribution Boards (MSDB-TB-05)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-05"]},
  {"id": 127330, "name": "Multi-Service Distribution Board (MSDB-TB-06)", "code": "MSDB-TB-06", "kind": "db", "task": "Distribution Boards (MSDB-TB-06)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-06"]},
  {"id": 127331, "name": "Multi-Service Distribution Board (MSDB-TB-08)", "code": "MSDB-TB-08", "kind": "db", "task": "Distribution Boards (MSDB-TB-08)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-08"]},
  {"id": 127332, "name": "Multi-Service Distribution Board (MSDB-TB-10)", "code": "MSDB-TB-10", "kind": "db", "task": "Distribution Boards (MSDB-TB-10)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-10"]},
  {"id": 127333, "name": "Multi-Service Distribution Board (MSDB-TB-11)", "code": "MSDB-TB-11", "kind": "db", "task": "Distribution Boards (MSDB-TB-11)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-11"]},
  {"id": 127334, "name": "Multi-Service Distribution Board (MSDB-TB-13)", "code": "MSDB-TB-13", "kind": "db", "task": "Distribution Boards (MSDB-TB-13)", "freq": ["3M", "6M", "12M"], "doc": "Certificate", "app": ["db-MSDB-TB-13"]}
];
