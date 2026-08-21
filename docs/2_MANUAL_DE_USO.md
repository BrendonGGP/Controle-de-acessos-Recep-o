# Manual de Uso do Sistema 📖

Este manual destina-se a Recepcionistas e Administradores do sistema. Ele cobre como operar as telas no dia a dia.

## 1. Tela de Login
O sistema não possui tela pública de cadastro para evitar acessos indevidos.
- Entre com o e-mail e a senha fornecidos pela TI.
- O sistema te levará automaticamente para o **Controle de Acesso** (se você for da Recepção) ou **Dashboard de Salas**.

## 2. Controle de Acesso (Check-in)
Nesta tela a Recepção registra a entrada e saída de pessoas no prédio corporativo.

- **Para registrar uma visita:** 
  1. Preencha os dados (Nome, CPF, Telefone).
  2. Escolha o tipo de entrada (Visita/Reunião, Entregas, Entrevista, etc.).
  3. No campo "Notificar Colaborador", **digite o nome do anfitrião** e clique nele.
  4. Marque "Enviar Aviso via WhatsApp" (se desejar alertar a pessoa de imediato).
  5. Clique em **Registrar Acesso**.
- **Saídas:** No botão "Registrar Saída", a recepção pode dar baixa no visitante quando ele for embora.

## 3. Salas de Reunião
Aqui fica o mapa de calor de todas as salas da empresa em tempo real.

- **Status da Sala:** O cartão ficará Vermelho ("Ocupada") se houver uma reunião ocorrendo no momento exato em que você olha a tela. Ele diz até que horas vai aquela reunião.
- **Como Agendar:** Clique em **"Agendar Sala"** no cartão desejado. Selecione o horário, duração e digite os nomes dos participantes.
- **Edição e Exclusão:** Para alterar um agendamento (ou deletar), clique em **"Ver todas reuniões"** na sala desejada. O sistema mostrará a agenda completa. Clique no ícone de lápis ou lixeira ao lado da reunião. *Ao editar, não disparamos aviso no WhatsApp novamente para evitar spam*.

## 4. Cadastro de Colaboradores
Apenas usuários autorizados podem cadastrar a base de funcionários da empresa.
- **Atenção:** O número de telefone deve ser o WhatsApp oficial da pessoa (pode incluir ou não o +55, o sistema trata automaticamente). 
- **Edição:** Basta clicar no ícone de edição ao lado do nome na tabela para atualizar e-mail, telefone ou cargo.

## 5. Mensagens (Templates Automáticos)
Onde você edita os recados que o sistema manda pelo WhatsApp.
- Os avisos possuem chaves curingas (Ex: `[NOME_VISITANTE]`, `[NOME_COLABORADOR]`).
- Quando um visitante chamado "João" chega para "Maria", o sistema substitui `[NOME_VISITANTE]` por "João" automaticamente.
- Não apague as palavras entre colchetes!

## 6. Administração (Apenas Admin)
Aba oculta para usuários da recepção.
- Serve para TI gerenciar senhas, criar contas de login e alterar permissões globais.
