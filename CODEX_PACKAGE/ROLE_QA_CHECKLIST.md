# ROLE QA CHECKLIST

## Scop

Confirmam ca vizibilitatea bazata pe rol functioneaza corect pentru:
- owner
- manager
- detailer

## Conturi Demo Necesare

- cont `owner`
- cont `manager`
- cont `detailer`

Aceste conturi trebuie sa existe deja in Supabase Auth.

## Setup

1. Deschide Supabase SQL Editor
2. Ruleaza:
   - `supabase/demo_role_setup.sql`
3. Inlocuieste emailurile placeholder din acel fisier inainte de rulare

### Varianta rapida daca exista un singur cont real

Daca in proiect exista doar un singur utilizator autentificat, foloseste:
- `supabase/role_qa_single_user.sql`

Aceasta varianta permite sa verifici pe rand:
- `owner`
- `manager`
- `detailer`

cu acelasi cont, schimband temporar rolul si asignarea unei solicitari demo.

## Rezultat Asteptat Dupa Setup

- profilul `owner` primeste rolul `owner`
- profilul `manager` primeste rolul `manager`
- profilul `detailer` primeste rolul `detailer`
- o solicitare demo este asignata tehnicianului
- in timeline apare un eveniment `assigned` pentru acea solicitare

## QA Pentru Proprietar

- [ ] poate deschide `Panou`
- [ ] poate deschide `Solicitari`
- [ ] poate deschide `Clienti`
- [ ] poate deschide `Servicii`
- [ ] poate deschide `Setari`
- [ ] poate crea o solicitare noua
- [ ] poate schimba statusul unei solicitari
- [ ] poate schimba `follow_up_at`
- [ ] poate adauga notite interne

## QA Pentru Manager

- [ ] poate deschide `Panou`
- [ ] poate deschide `Solicitari`
- [ ] poate deschide `Clienti`
- [ ] poate deschide `Servicii`
- [ ] nu vede `Setari` in navigatie
- [ ] poate crea o solicitare noua
- [ ] poate schimba statusul unei solicitari
- [ ] poate schimba `follow_up_at`
- [ ] poate adauga notite interne

## QA Pentru Tehnician Detailing

- [ ] poate deschide `Panou`
- [ ] poate deschide `Solicitari`
- [ ] nu vede `Clienti`
- [ ] nu vede `Servicii`
- [ ] nu vede `Setari`
- [ ] nu vede formularul `Solicitare noua`
- [ ] vede doar solicitarile asignate
- [ ] nu poate schimba statusul
- [ ] nu poate schimba `follow_up_at`
- [ ] nu poate adauga notite interne
- [ ] poate vedea timeline-ul si istoricul solicitarii

## Note Pentru Demo

Pentru un demo cat mai clar:
- asigneaza o solicitare credibila tehnicianului
- foloseste o solicitare cu serviciu realist si istoric in timeline
- arata mai intai `owner`, apoi `manager`, apoi `detailer`

## Pasul Recomandat Dupa QA

Dupa confirmarea rolurilor:
1. mai facem un demo-hardening scurt pe date si flow
2. apoi continuam cu urmatorul strat de produs: AI assistant sau mobile planning, dar doar peste acest fundament stabil
