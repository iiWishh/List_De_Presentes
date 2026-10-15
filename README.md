# List_De_Presentes

Aplicação web simples para gerenciar e reservar presentes — feita em HTML/CSS/JavaScript e integrada ao Supabase.

Este repositório contém uma interface para exibir uma lista de presentes, permitir buscas e filtros, e reservar itens (gravando no Supabase). O código do frontend está em app.js e os estilos em CSS.

## Funcionalidades

- Listar presentes cadastrados no Supabase
- Buscar por nome
- Filtrar por status (Todos / Disponíveis / Reservados)
- Reservar presente informando nome e sobrenome (modal)
- Desfazer reserva (protegido por senha)
- Barra de progresso com percentual de reservas
- Suporte a tema claro/escuro

## Demo

Abra `index.html` localmente (ou sirva a pasta com um servidor estático) e configure as credenciais do Supabase em `app.js`.

## Requisitos

- Um projeto no Supabase
- Navegador moderno com suporte a ES6

## Configuração do Supabase

1. Crie um projeto no Supabase (https://app.supabase.com).
2. No projeto, crie uma tabela chamada `presentes` com a estrutura mínima abaixo:

```sql
create table public.presentes (
  id serial primary key,
  nome text not null,
  reservado boolean not null default false,
  reservado_por text
);
```

3. Nas configurações do projeto (Settings > API) copie a URL do Supabase e a `anon` key.
4. No arquivo `app.js` substitua as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` com os valores do seu projeto:

```javascript
const SUPABASE_URL = 'https://<seu-projeto>.supabase.co';
const SUPABASE_ANON_KEY = '<sua-anon-key-aqui>';
```

5. (Opcional) Em Settings > API > Allowed CORS Origins adicione a origem onde o app será hospedado (ex.: `http://localhost:5173` ou `https://seusite.com`).

### Observações de segurança

- A `anon` key do Supabase é pensada para operações públicas/cliente, mas ainda assim evite comitar chaves sensíveis em repositórios públicos. Considere usar variáveis de ambiente ou um servidor intermediário para operações protegidas.
- A operação de desfazer reserva, no `app.js`, usa uma senha fixa (`remove123`) apenas para conveniência — para produção, implemente um endpoint autenticado ou um fluxo de autorização apropriado.

## Como executar localmente

Opção rápida (abrir arquivo):
- Abra `index.html` no navegador (alguns recursos podem exigir ser servido via HTTP devido a módulos/requests).

Opção recomendada (servidor local):
- Com Python 3:
  - `python -m http.server 8000`
  - Acesse `http://localhost:8000`

- Com Node.js (serve / live-server / http-server):
  - `npx http-server -c-1 .`

## Estrutura do repositório

- index.html — página principal
- app.js — lógica do frontend e integração com Supabase
- styles.css — estilos
- assets/ — imagens e ícones (se houver)

## Contribuição

Pull requests são bem-vindos! Para alterações relevantes, abra uma issue antes para discutirmos a abordagem.

## Licença

Escolha uma licença (ex.: MIT). Se quiser, posso adicionar um `LICENSE` com texto pronto.

## Contato

Se preferir, abra uma issue ou me marque (@iiWishh) no GitHub.
