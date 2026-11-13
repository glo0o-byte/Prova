# PolyTrick

Mini gestionale collaborativo per eventi: eventi definitivi, sala riservata, ospiti, sponsor, task e persone presenti.

## Modalità demo

Apri `index.html` localmente: l'app funziona con dati demo e salvataggi locali durante la sessione del browser.

## Modalità collaborativa gratuita

La versione collaborativa usa:
- GitHub Pages per il frontend
- Supabase Free per database + autenticazione + realtime

### 1. Crea il progetto Supabase
Crea un progetto gratuito su Supabase.

### 2. Crea database e sicurezza
Apri SQL Editor e incolla tutto il contenuto di `supabase-schema.sql`.

### 3. Crea gli utenti
In Authentication > Users crea un account per ogni membro del team.

### 4. Configura l'app
Copia `config.example.js` in `config.js` e inserisci:
- URL del progetto Supabase
- anon/publishable key

Non usare la `service_role` key nel browser.

### 5. Pubblica su GitHub Pages
Carica tutti i file in un repository GitHub e fai push sul branch `main`.
Il workflow `.github/workflows/pages.yml` pubblicherà automaticamente il sito.

### 6. Dominio / accesso
GitHub Pages serve il frontend. L'accesso ai dati è protetto da Supabase Authentication + RLS: chi non è autenticato non può leggere o modificare le tabelle.

## Struttura
- Dashboard
- Eventi definitivi
  - sala riservata
  - dettagli sala
  - persone presenti con ora di arrivo/partenza
  - task dell'evento
  - ospiti dell'evento
  - sponsor dell'evento
- Ospiti
  - contattato / da contattare
  - chi ha contattato
  - data contatto
  - stato
- Sponsor
  - chi ha contattato
  - data
  - cosa danno
  - cosa vogliono in cambio
  - stato
- Task
  - assegnatario
  - scadenza
  - priorità
  - stato

## Nota importante
Il frontend contiene solo la anon/publishable key di Supabase. La sicurezza vera è nelle policy RLS del database. Non inserire mai una service_role key in `config.js`.
