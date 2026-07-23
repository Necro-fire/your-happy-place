
-- Expand support knowledge base: 17 categories with subitems
WITH new_cats(nome, slug, icone, ordem) AS (
  VALUES
    ('Conta e Login', 'conta-login', 'User', 1),
    ('Assinatura', 'assinatura', 'CreditCard', 2),
    ('Configurações', 'configuracoes', 'Settings', 3),
    ('Usuários e Permissões', 'usuarios-permissoes', 'Users', 4),
    ('Produtos', 'produtos', 'Package', 5),
    ('Cardápio Público', 'cardapio-publico', 'BookOpen', 6),
    ('PDV', 'pdv', 'Monitor', 7),
    ('Pedidos', 'pedidos', 'ShoppingBag', 8),
    ('Clientes', 'clientes', 'UserCircle', 9),
    ('Impressão', 'impressao', 'Printer', 10),
    ('Relatórios', 'relatorios', 'BarChart3', 11),
    ('Performance', 'performance', 'Zap', 12),
    ('Responsividade', 'responsividade', 'Smartphone', 13),
    ('Segurança', 'seguranca', 'Shield', 14),
    ('Erros do Sistema', 'erros-sistema', 'AlertTriangle', 15),
    ('Desenvolvedor Master', 'desenvolvedor-master', 'Crown', 16),
    ('Outros', 'outros', 'HelpCircle', 17)
),
ins_cats AS (
  INSERT INTO public.support_categories (nome, slug, icone, ordem, ativo)
  SELECT nome, slug, icone, ordem, true FROM new_cats
  ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, icone=EXCLUDED.icone, ordem=EXCLUDED.ordem, ativo=true
  RETURNING id, slug
),
probs(cat_slug, ord, titulo, descricao) AS (
  VALUES
    ('conta-login', 1, 'Criar conta', 'Como criar uma nova conta no sistema.'),
    ('conta-login', 2, 'Entrar no sistema', 'Problemas para fazer login.'),
    ('conta-login', 3, 'Senha', 'Redefinir, alterar ou recuperar senha.'),
    ('conta-login', 4, 'E-mail', 'Alterar ou confirmar e-mail cadastrado.'),
    ('conta-login', 5, 'Google Login', 'Erros ao entrar com Google.'),
    ('conta-login', 6, 'Verificação', 'Verificação de conta e e-mail.'),
    ('conta-login', 7, 'Conta bloqueada', 'O que fazer se sua conta foi bloqueada.'),

    ('assinatura', 1, 'Plano', 'Detalhes sobre planos disponíveis.'),
    ('assinatura', 2, 'Pagamento', 'Problemas com pagamento da assinatura.'),
    ('assinatura', 3, 'Renovação', 'Como funciona a renovação da assinatura.'),
    ('assinatura', 4, 'Cancelamento', 'Como cancelar sua assinatura.'),
    ('assinatura', 5, 'Teste grátis', 'Sobre o período de teste gratuito de 7 dias.'),
    ('assinatura', 6, 'Cobrança', 'Dúvidas sobre valores e cobranças.'),

    ('configuracoes', 1, 'Dados da empresa', 'Alterar dados cadastrais da empresa.'),
    ('configuracoes', 2, 'Horários', 'Configurar horários de funcionamento.'),
    ('configuracoes', 3, 'Endereço', 'Alterar endereço do estabelecimento.'),
    ('configuracoes', 4, 'Tema', 'Personalizar o tema visual.'),
    ('configuracoes', 5, 'Paleta de cores', 'Escolher e aplicar paletas de cores.'),
    ('configuracoes', 6, 'Modo claro/escuro', 'Alternar entre modo claro e escuro.'),

    ('usuarios-permissoes', 1, 'Criar funcionários', 'Como cadastrar novos usuários.'),
    ('usuarios-permissoes', 2, 'Cargos', 'Definir cargos e funções.'),
    ('usuarios-permissoes', 3, 'Permissões', 'Configurar permissões por papel.'),
    ('usuarios-permissoes', 4, 'Acessos', 'Gerenciar acessos e restrições.'),

    ('produtos', 1, 'Criar produto', 'Como cadastrar um novo produto.'),
    ('produtos', 2, 'Editar', 'Editar dados de um produto existente.'),
    ('produtos', 3, 'Excluir', 'Excluir ou desativar um produto.'),
    ('produtos', 4, 'Imagens', 'Adicionar e editar imagens do produto.'),
    ('produtos', 5, 'Preços', 'Configurar preços e margens.'),
    ('produtos', 6, 'Categorias', 'Organizar produtos em categorias.'),
    ('produtos', 7, 'Complementos', 'Criar grupos de complementos.'),

    ('cardapio-publico', 1, 'Link público', 'Compartilhar link do cardápio.'),
    ('cardapio-publico', 2, 'QR Code', 'Gerar QR Code do cardápio.'),
    ('cardapio-publico', 3, 'Produtos não aparecem', 'Produtos não aparecem no cardápio público.'),
    ('cardapio-publico', 4, 'Banner', 'Configurar banner principal.'),
    ('cardapio-publico', 5, 'Carrossel', 'Configurar carrossel de imagens.'),
    ('cardapio-publico', 6, 'Layout', 'Ajustar layout do cardápio público.'),

    ('pdv', 1, 'Caixa', 'Problemas relacionados ao caixa no PDV.'),
    ('pdv', 2, 'Pedidos', 'Criar e gerenciar pedidos no PDV.'),
    ('pdv', 3, 'Mesas', 'Atendimento em mesa via PDV.'),
    ('pdv', 4, 'Delivery', 'Vendas para delivery.'),
    ('pdv', 5, 'Retirada', 'Vendas para retirada no balcão.'),
    ('pdv', 6, 'Produtos', 'Produtos não aparecem ou faltam no PDV.'),
    ('pdv', 7, 'Lentidão', 'PDV apresentando lentidão.'),

    ('pedidos', 1, 'Criar pedido', 'Como criar um novo pedido.'),
    ('pedidos', 2, 'Alterar pedido', 'Editar itens ou dados de um pedido.'),
    ('pedidos', 3, 'Cancelar', 'Cancelar um pedido ativo.'),
    ('pedidos', 4, 'Status', 'Alterar status do pedido.'),
    ('pedidos', 5, 'Produção', 'Acompanhar pedidos em produção.'),
    ('pedidos', 6, 'Entrega', 'Gestão de entregas.'),

    ('clientes', 1, 'Cadastro', 'Cadastrar novo cliente.'),
    ('clientes', 2, 'Histórico', 'Ver histórico de compras do cliente.'),
    ('clientes', 3, 'Dados incorretos', 'Corrigir dados de cliente.'),

    ('impressao', 1, 'Impressora', 'Configurar impressora.'),
    ('impressao', 2, 'Pedido', 'Reimprimir pedido.'),
    ('impressao', 3, 'Cupom', 'Configurar cupom de venda.'),
    ('impressao', 4, 'Erros', 'Erros comuns de impressão.'),

    ('relatorios', 1, 'Dados', 'Dados nos relatórios estão incorretos.'),
    ('relatorios', 2, 'Exportação', 'Como exportar em CSV ou PDF.'),
    ('relatorios', 3, 'Valores', 'Divergência nos valores exibidos.'),

    ('performance', 1, 'Sistema lento', 'O sistema está lento.'),
    ('performance', 2, 'Travamentos', 'Sistema travando durante o uso.'),
    ('performance', 3, 'Carregamento', 'Carregamento demorado das páginas.'),
    ('performance', 4, 'Atualizações em tempo real', 'Dados não atualizam em tempo real.'),

    ('responsividade', 1, 'Celular', 'Problemas ao acessar pelo celular.'),
    ('responsividade', 2, 'Tablet', 'Problemas ao acessar pelo tablet.'),
    ('responsividade', 3, 'Computador', 'Problemas de exibição no computador.'),
    ('responsividade', 4, 'Layout quebrado', 'Layout desalinhado ou quebrado.'),

    ('seguranca', 1, 'Acesso suspeito', 'Detectei acesso suspeito na minha conta.'),
    ('seguranca', 2, 'Senha', 'Boas práticas e alteração de senha.'),
    ('seguranca', 3, 'Sessões', 'Gerenciar sessões ativas.'),
    ('seguranca', 4, 'Permissões', 'Auditar permissões de usuários.'),

    ('erros-sistema', 1, 'Tela branca', 'Sistema abre uma tela em branco.'),
    ('erros-sistema', 2, 'Erro inesperado', 'Mensagem de erro inesperado.'),
    ('erros-sistema', 3, 'Página não encontrada', 'Página não encontrada (404).'),
    ('erros-sistema', 4, 'Bugs', 'Reportar bug do sistema.'),

    ('desenvolvedor-master', 1, 'Licença', 'Dúvidas sobre licenças.'),
    ('desenvolvedor-master', 2, 'Chaves', 'Geração e uso de chaves de licença.'),
    ('desenvolvedor-master', 3, 'Configurações master', 'Configurações do painel Master.'),
    ('desenvolvedor-master', 4, 'Atualizações', 'Atualizações do sistema.'),

    ('outros', 1, 'Sugestões', 'Enviar sugestões de melhoria.'),
    ('outros', 2, 'Bugs', 'Reportar bugs diversos.'),
    ('outros', 3, 'Melhorias', 'Solicitar melhorias.'),
    ('outros', 4, 'Dúvidas gerais', 'Outras dúvidas sobre o sistema.')
)
INSERT INTO public.support_problems (category_id, titulo, descricao, ordem, ativo)
SELECT c.id, p.titulo, p.descricao, p.ord, true
FROM probs p
JOIN ins_cats c ON c.slug = p.cat_slug
ON CONFLICT DO NOTHING;
