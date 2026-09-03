<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy Automático no Vercel
Sempre ao concluir uma atualização, ajuste ou correção no código solicitada pelo usuário:
1. Validar a integridade com `npx tsc --noEmit`.
2. Fazer `git add`, `git commit` com mensagem descritiva em português.
3. Fazer `git push origin main` para disparar automaticamente a compilação e deploy em produção no Vercel.
