# Retorno da tela de pedidos

`OrderScreen.before-complete.tsx.bak` preserva a tela de três etapas imediatamente antes da versão "Visão completa". Para voltar a ela, copie esse arquivo sobre `src/screens/OrderScreen.tsx` e execute lint e typecheck.

`OrderScreen.before-guided.tsx.bak` é a tela anterior ao fluxo guiado de três etapas. A cópia veio da versão `HEAD` de `src/screens/OrderScreen.tsx` com os ajustes de teclado que já estavam em andamento: `KeyboardPressable`/`KeyboardTextInput` e `keyboardShouldPersistTaps="handled"` nas duas listas horizontais.

Para restaurar somente a tela, na raiz do projeto, execute no PowerShell:

```powershell
Copy-Item -LiteralPath .\backups\OrderScreen.before-guided.tsx.bak -Destination .\src\screens\OrderScreen.tsx -Force
```

Depois, confira a alteração com `git diff -- src/screens/OrderScreen.tsx` e execute `npx expo lint` e `npx tsc --noEmit`. O backup usa `src/ui/KeyboardControls.tsx`; mantenha esse arquivo ao restaurar.
