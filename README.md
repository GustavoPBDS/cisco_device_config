# Simulador de Redes com Análise de Configuração Assistida por IA

Este repositório contém o código-fonte do artefato desenvolvido como Trabalho de Conclusão de Curso (TCC) no Curso Superior de Tecnologia em Telemática do Instituto Federal da Paraíba (IFPB) - Campus Campina Grande.

**Autor:** Gustavo Ponciano Barbosa da Silva  
**Orientador:** Prof. Danyllo Wagner Albuquerque, DSc.

## 📋 Sobre o Projeto

Esta aplicação é um simulador de redes de computadores *web-based* que integra modelos de linguagem (LLM) para auxiliar no processo de aprendizagem. O sistema permite a criação de topologias, configuração via GUI e CLI, e oferece um módulo de "Análise Inteligente" que diagnostica erros lógicos e de segurança nas configurações realizadas.

### Principais Funcionalidades
- Criação de topologias via *drag-and-drop*.
- Configuração síncrona (Interface Gráfica ↔ Linha de Comando).
- Persistência local automática (via `localforage`).
- Integração com **Google Gemini** para análise pedagógica de cenários.

## 🛠️ Tecnologias Utilizadas

- **Framework:** Next.js (React)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Visualização:** React Flow
- **IA:** Google Generative AI SDK
- **Infraestrutura de Teste:** Hostinger VPS + Nginx

## 🚀 Como Executar Localmente

Para rodar este projeto na sua máquina, você precisará do [Node.js](https://nodejs.org/) instalado.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   cd nome-da-pasta
   ```

2. **Instale as dependências:**

   Usando npm:
   ```bash
   npm install
   npm run dev
   ```

   Usando pnpm:
   ```bash
   pnpm install
   pnpm dev
   ```

   Usando yarn:
   ```bash
   yarn install
   yarn dev
   ```

3. **Configure as Variáveis de Ambiente:**

   Crie um arquivo chamado `.env.local` na raiz do projeto e adicione sua chave de API do Google Gemini (ou credenciais equivalentes usadas pelo adaptador de LLM do projeto):

   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

   Observação: consulte o arquivo `src/app/api/analyze-scenario/route.ts` (ou a documentação do projeto) para saber outras variáveis esperadas.

4. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   # ou pnpm dev
   # ou yarn dev
   ```

5. **Acesse a aplicação:**

   Abra `http://localhost:3000` no seu navegador.

## Estrutura do Projeto (resumo)

- `src/app/` — rotas Next.js e componentes de alto nível
- `src/components/` — componentes React reutilizáveis (GUI, menus, formulários)
- `src/hooks/` — hooks customizados (ex.: `useCLI.ts`)
- `src/contexts/` — contextos React (estado do cenário)
- `src/app/api/analyze-scenario/` — rota API para análise com LLM
- `src/utils/` — utilitários auxiliares (hashing, exportações, cálculos de IP)

## 🧪 Testes e Validação

Este repositório não inclui uma suíte de testes automatizados por padrão. Para validação rápida local:

- Execute o servidor de desenvolvimento e interaja com a UI para criar topologias e usar o módulo de Análise Inteligente.
- Verifique os logs do servidor (console) para mensagens relacionadas à integração com a API de IA.

## 🔐 Observações de Segurança

- Não comite chaves de API no repositório. Use sempre arquivos de ambiente (`.env.local`) e verifique `.gitignore`.
- Em produção, proteja as rotas da API que fazem chamadas ao provedor de IA (rate limiting, autenticação, revisão de payloads).

## 📜 Licença

Este projeto é desenvolvido para fins acadêmicos.