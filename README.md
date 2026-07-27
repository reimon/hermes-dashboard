# Hermes Dashboard

Painel local (Next.js 16 + React 19) para o **Hermes Agent**. Lê os dados do agente
em `~/.hermes/` e apresenta:

- **Dashboard** — visão geral de uso, tokens e custo estimado por modelo/período
- **Providers** — provedores configurados, teste de conexão e listagem de modelos ao vivo
- **Instances** — registro multi‑LLM com tags, prioridade, fallback e rotação
- **API Keys** — leitura de `config.yaml` e `.env` (chaves exibidas mascaradas)
- **Sessions** — histórico de sessões, chamadas de API e logs do agente

Os dados são lidos de `~/.hermes/` (`state.db`, `config.yaml`, `.env`,
`logs/agent.log`, `llm-instances.json`). Você pode apontar para outro diretório com
a variável de ambiente `HERMES_HOME`.

---

## Requisitos

| Requisito | Versão / observação |
|-----------|---------------------|
| **Node.js** | `>= 20.9` (LTS 20 ou 22 recomendado — Next 16 e `better-sqlite3` 12 exigem essa faixa) |
| **npm** | 10+ (acompanha o Node) |
| **git** | para clonar o repositório |
| **Ferramentas de build** | `build-essential` + `python3` — fallback de compilação do `better-sqlite3` (módulo nativo) |
| **lsof** | usado por `scripts/dashboard` para detectar processos na porta |
| **Dados do Hermes Agent** | um diretório `~/.hermes/` populado (ou `HERMES_HOME` apontando para ele) |

> `better-sqlite3` tenta baixar um binário pré‑compilado primeiro; se não houver um
> compatível, ele compila do zero — por isso as ferramentas de build são necessárias.

---

## Instalação no Linux (passo a passo)

### 1. Instalar as dependências do sistema

**Debian / Ubuntu:**

```bash
sudo apt-get update
sudo apt-get install -y curl git build-essential python3 lsof
```

**Fedora / RHEL:**

```bash
sudo dnf install -y curl git make gcc-c++ python3 lsof
```

**Arch:**

```bash
sudo pacman -S --needed curl git base-devel python lsof
```

### 2. Instalar o Node.js (>= 20.9)

**Opção A — nvm (recomendado, sem `sudo`, funciona em qualquer distro):**

```bash
# confira a última versão em github.com/nvm-sh/nvm#installing-and-updating
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec "$SHELL"          # recarrega o shell (ou abra um novo terminal)
nvm install --lts      # instala a última LTS (>= 20.9)
nvm use --lts
```

**Opção B — NodeSource (Debian/Ubuntu, instala Node no sistema):**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Confirme as versões:

```bash
node -v   # v20.9+ ou v22+
npm -v    # 10+
```

### 3. Clonar o repositório

```bash
git clone https://github.com/reimon/hermes-dashboard.git
cd hermes-dashboard
```

### 4. Instalar as dependências do projeto

```bash
npm install
```

> Se o `better-sqlite3` cair para compilação do zero, é aqui que as ferramentas de
> build do passo 1 entram. Erros de `node-gyp`? Veja [Solução de problemas](#solução-de-problemas).

### 5. Apontar para os dados do Hermes Agent

O painel lê de `~/.hermes/` por padrão. Se o seu agente guarda os dados em outro
lugar, defina `HERMES_HOME`:

```bash
export HERMES_HOME="/caminho/para/.hermes"
```

> Sem um `state.db` válido, as páginas de sessões/uso retornam erro
> (`state.db not found at …`). As demais páginas continuam funcionando.

### 6. Rodar em modo de desenvolvimento

```bash
npm run dev
```

Acesse **http://localhost:3000**. A página recarrega sozinha ao editar os arquivos.

### 7. Rodar em produção

```bash
npm run build
npm start
```

Por padrão escuta em `http://localhost:3000`. Para expor na rede e/ou trocar a porta:

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

---

## Rodar como serviço em segundo plano

### Script `scripts/dashboard` (start / stop / status / logs)

O projeto inclui um utilitário que sobe o painel desacoplado do terminal e gerencia
PID/porta/logs:

```bash
./scripts/dashboard start      # sobe em background (modo dev)
./scripts/dashboard status     # estado do processo, porta e HTTP
./scripts/dashboard logs       # acompanha os logs (Ctrl+C para sair)
./scripts/dashboard stop       # para o painel e libera a porta
./scripts/dashboard restart
```

Variáveis de ambiente aceitas:

```bash
PORT=3001 ./scripts/dashboard start     # porta customizada
HOST=0.0.0.0 ./scripts/dashboard start  # bind em todas as interfaces
MODE=prod ./scripts/dashboard start     # produção (faz build se necessário)
```

Os mesmos comandos existem como scripts npm: `npm run dashboard:start`,
`dashboard:stop`, `dashboard:restart`, `dashboard:status`, `dashboard:logs`.

> Se aparecer `Permission denied`, dê permissão de execução:
> `chmod +x scripts/dashboard`.

### systemd (opcional, para iniciar no boot)

Crie `/etc/systemd/system/hermes-dashboard.service` (ajuste `User` e os caminhos):

```ini
[Unit]
Description=Hermes Dashboard
After=network.target

[Service]
Type=simple
User=SEU_USUARIO
WorkingDirectory=/home/SEU_USUARIO/hermes-dashboard
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
# Environment=HERMES_HOME=/home/SEU_USUARIO/.hermes
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-dashboard
sudo systemctl status hermes-dashboard
```

> Usando **nvm**, o `npm`/`node` não ficam em `/usr/bin`. Descubra o caminho com
> `which node` e use o binário absoluto no `ExecStart` (ex.:
> `ExecStart=/home/SEU_USUARIO/.nvm/versions/node/vXX.Y.Z/bin/npm start`), ou
> instale o Node no sistema (Opção B do passo 2). Lembre de rodar `npm run build`
> antes de habilitar o serviço.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `HERMES_HOME` | `~/.hermes` | Diretório com os dados do agente (`state.db`, `config.yaml`, `.env`, `logs/`, `llm-instances.json`) |
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `0.0.0.0` | Interface de bind (usado por `scripts/dashboard`) |
| `MODE` | `dev` | `dev` (`next dev`) ou `prod` (`next start`) — usado por `scripts/dashboard` |

---

## Scripts npm

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run dashboard[:start\|:stop\|:restart\|:status\|:logs]` | Wrapper do `scripts/dashboard` |

---

## Solução de problemas

**`better-sqlite3` falhou ao compilar / erros de `node-gyp`**
Instale as ferramentas de build (passo 1) e recompile:

```bash
npm rebuild better-sqlite3
# ou, do zero:
rm -rf node_modules package-lock.json && npm install
```

**`Error: state.db not found at ~/.hermes/state.db`**
O Hermes Agent ainda não gerou dados, ou o caminho está errado. Verifique se
`~/.hermes/state.db` existe ou defina `HERMES_HOME` para o diretório correto.

**Porta 3000 ocupada (`EADDRINUSE`)**
Use outra porta ou pare o processo:

```bash
PORT=3001 npm run dev
# ou, se subiu pelo script:
./scripts/dashboard stop
```

**`./scripts/dashboard: Permission denied`**
```bash
chmod +x scripts/dashboard
```

**`lsof: command not found` no `status`/`start`**
Instale o `lsof` (passo 1) — o script o usa para detectar quem ocupa a porta.

**Versão do Node incompatível**
Next 16 exige Node `>= 20.9`. Verifique com `node -v` e, se usar nvm,
`nvm use --lts`.

---

## Estrutura do projeto

```
app/                 Rotas (App Router) + API routes em app/api/
  api/               insights, config, providers, sessions, logs, instances
lib/                 Camada de dados do Hermes (hermes.ts, instances.ts, tipos)
components/ui/       Componentes de interface
scripts/dashboard    Utilitário de start/stop/status/logs
```

> **Nota para contribuidores:** esta versão do Next.js pode ter mudanças de API em
> relação ao que você conhece — consulte `node_modules/next/dist/docs/` antes de
> escrever código novo (veja `AGENTS.md`).
