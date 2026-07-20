export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json
          entidade: string
          entidade_id: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json
          entidade: string
          entidade_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          forma_pagamento: Database["public"]["Enums"]["pay_method"] | null
          id: string
          order_id: string | null
          session_id: string
          tipo: Database["public"]["Enums"]["cash_mov_tipo"]
          valor: number
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          id?: string
          order_id?: string | null
          session_id: string
          tipo: Database["public"]["Enums"]["cash_mov_tipo"]
          valor: number
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          id?: string
          order_id?: string | null
          session_id?: string
          tipo?: Database["public"]["Enums"]["cash_mov_tipo"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          aberto_em: string
          aberto_por: string | null
          diferenca: number | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacoes: string | null
          saldo_esperado: number | null
          saldo_final: number | null
          saldo_inicial: number
          status: Database["public"]["Enums"]["cash_status"]
        }
        Insert: {
          aberto_em?: string
          aberto_por?: string | null
          diferenca?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["cash_status"]
        }
        Update: {
          aberto_em?: string
          aberto_por?: string | null
          diferenca?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes?: string | null
          saldo_esperado?: number | null
          saldo_final?: number | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["cash_status"]
        }
        Relationships: []
      }
      categories: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          codigo: string
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          email?: string
          id?: string
          nome: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      combo_items: {
        Row: {
          combo_id: string
          id: string
          product_id: string
          quantidade: number
        }
        Insert: {
          combo_id: string
          id?: string
          product_id: string
          quantidade?: number
        }
        Update: {
          combo_id?: string
          id?: string
          product_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          custo_fixo_mensal: number
          email_empresa: string
          endereco_empresa: string
          id: string
          logo_url: string
          margem_custo_percentual: number
          nome_empresa: string
          telefone_empresa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_fixo_mensal?: number
          email_empresa?: string
          endereco_empresa?: string
          id?: string
          logo_url?: string
          margem_custo_percentual?: number
          nome_empresa?: string
          telefone_empresa?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo_fixo_mensal?: number
          email_empresa?: string
          endereco_empresa?: string
          id?: string
          logo_url?: string
          margem_custo_percentual?: number
          nome_empresa?: string
          telefone_empresa?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      complement_groups: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          max_escolhas: number
          min_escolhas: number
          nome: string
          obrigatorio: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          max_escolhas?: number
          min_escolhas?: number
          nome: string
          obrigatorio?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          max_escolhas?: number
          min_escolhas?: number
          nome?: string
          obrigatorio?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      complements: {
        Row: {
          ativo: boolean
          created_at: string
          group_id: string
          id: string
          nome: string
          ordem: number
          preco: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          group_id: string
          id?: string
          nome: string
          ordem?: number
          preco?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          group_id?: string
          id?: string
          nome?: string
          ordem?: number
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "complements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          credito: number
          data_nascimento: string | null
          email: string | null
          endereco_json: Json | null
          id: string
          nome: string
          observacoes: string | null
          pontos: number
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          credito?: number
          data_nascimento?: string | null
          email?: string | null
          endereco_json?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          pontos?: number
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          credito?: number
          data_nascimento?: string | null
          email?: string | null
          endereco_json?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          pontos?: number
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          email: string | null
          id: string
          nome: string
          salario: number | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          id?: string
          nome: string
          salario?: number | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          id?: string
          nome?: string
          salario?: number | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      filiais: {
        Row: {
          ativa: boolean
          created_at: string
          endereco: string | null
          id: string
          nome: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financeiro_movimentos: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["pay_method"] | null
          id: string
          observacoes: string | null
          order_id: string | null
          status: Database["public"]["Enums"]["fin_status"]
          supplier_id: string | null
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao: string
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          id?: string
          observacoes?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["fin_status"]
          supplier_id?: string | null
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          id?: string
          observacoes?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["fin_status"]
          supplier_id?: string | null
          tipo?: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_movimentos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_movimentos_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cancelado: boolean
          combo_id: string | null
          complementos: Json | null
          created_at: string
          desconto: number
          id: string
          observacoes: string | null
          order_id: string
          preco_unitario: number
          product_id: string | null
          produto_nome: string
          quantidade: number
          status: string
          subtotal: number
        }
        Insert: {
          cancelado?: boolean
          combo_id?: string | null
          complementos?: Json | null
          created_at?: string
          desconto?: number
          id?: string
          observacoes?: string | null
          order_id: string
          preco_unitario?: number
          product_id?: string | null
          produto_nome: string
          quantidade?: number
          status?: string
          subtotal?: number
        }
        Update: {
          cancelado?: boolean
          combo_id?: string | null
          complementos?: Json | null
          created_at?: string
          desconto?: number
          id?: string
          observacoes?: string | null
          order_id?: string
          preco_unitario?: number
          product_id?: string | null
          produto_nome?: string
          quantidade?: number
          status?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          created_at: string
          forma: Database["public"]["Enums"]["pay_method"]
          id: string
          order_id: string
          troco: number
          valor: number
        }
        Insert: {
          created_at?: string
          forma: Database["public"]["Enums"]["pay_method"]
          id?: string
          order_id: string
          troco?: number
          valor: number
        }
        Update: {
          created_at?: string
          forma?: Database["public"]["Enums"]["pay_method"]
          id?: string
          order_id?: string
          troco?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          acrescimo: number
          bairro: string | null
          cancelado_em: string | null
          cep: string | null
          cidade: string | null
          cliente_endereco: string | null
          cliente_nome: string
          cliente_telefone: string | null
          complemento: string | null
          created_at: string
          criado_por: string | null
          desconto: number
          estado: string | null
          finalizado_em: string | null
          forma_pagamento: Database["public"]["Enums"]["pay_method"] | null
          garcom_id: string | null
          horario_retirada: string | null
          id: string
          mesa_id: string | null
          motivo_cancelamento: string | null
          numero: number
          numero_endereco: string | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["order_origem"]
          ponto_referencia: string | null
          rua: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          suspenso: boolean
          suspenso_em: string | null
          suspenso_nome: string | null
          taxa_entrega: number
          tipo: Database["public"]["Enums"]["order_tipo"]
          total: number
          troco_para: number | null
          updated_at: string
        }
        Insert: {
          acrescimo?: number
          bairro?: string | null
          cancelado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          complemento?: string | null
          created_at?: string
          criado_por?: string | null
          desconto?: number
          estado?: string | null
          finalizado_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          garcom_id?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          numero_endereco?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["order_origem"]
          ponto_referencia?: string | null
          rua?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          suspenso?: boolean
          suspenso_em?: string | null
          suspenso_nome?: string | null
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_tipo"]
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Update: {
          acrescimo?: number
          bairro?: string | null
          cancelado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          complemento?: string | null
          created_at?: string
          criado_por?: string | null
          desconto?: number
          estado?: string | null
          finalizado_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["pay_method"] | null
          garcom_id?: string | null
          horario_retirada?: string | null
          id?: string
          mesa_id?: string | null
          motivo_cancelamento?: string | null
          numero?: number
          numero_endereco?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["order_origem"]
          ponto_referencia?: string | null
          rua?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          suspenso?: boolean
          suspenso_em?: string | null
          suspenso_nome?: string | null
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_tipo"]
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_orders: {
        Row: {
          created_at: string
          data_producao: string
          id: string
          observacoes: string | null
          product_id: string | null
          produto_nome: string
          quantidade_planejada: number
          quantidade_produzida: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["prod_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_producao?: string
          id?: string
          observacoes?: string | null
          product_id?: string | null
          produto_nome: string
          quantidade_planejada?: number
          quantidade_produzida?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["prod_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_producao?: string
          id?: string
          observacoes?: string | null
          product_id?: string | null
          produto_nome?: string
          quantidade_planejada?: number
          quantidade_produzida?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["prod_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_complement_groups: {
        Row: {
          group_id: string
          product_id: string
        }
        Insert: {
          group_id: string
          product_id: string
        }
        Update: {
          group_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_complement_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "complement_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_complement_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          category_id: string | null
          codigo: string | null
          codigo_barras: string | null
          controla_estoque: boolean
          created_at: string
          custo: number | null
          descricao: string | null
          destaque: boolean
          disponivel: boolean
          estoque_atual: number
          estoque_minimo: number
          favorito: boolean
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          preco: number
          preco_promo: number | null
          slug: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          controla_estoque?: boolean
          created_at?: string
          custo?: number | null
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          estoque_atual?: number
          estoque_minimo?: number
          favorito?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          preco?: number
          preco_promo?: number | null
          slug?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string | null
          codigo_barras?: string | null
          controla_estoque?: boolean
          created_at?: string
          custo?: number | null
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          estoque_atual?: number
          estoque_minimo?: number
          favorito?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          preco?: number
          preco_promo?: number | null
          slug?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          cor_tema: string
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          cor_tema?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          cor_tema?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacidade: number
          created_at: string
          garcom_id: string | null
          id: string
          mesa_pai_id: string | null
          numero: number
          ocupada_em: string | null
          pos_x: number | null
          pos_y: number | null
          reserva_horario: string | null
          reserva_nome: string | null
          reserva_telefone: string | null
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          garcom_id?: string | null
          id?: string
          mesa_pai_id?: string | null
          numero: number
          ocupada_em?: string | null
          pos_x?: number | null
          pos_y?: number | null
          reserva_horario?: string | null
          reserva_nome?: string | null
          reserva_telefone?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          garcom_id?: string | null
          id?: string
          mesa_pai_id?: string | null
          numero?: number
          ocupada_em?: string | null
          pos_x?: number | null
          pos_y?: number | null
          reserva_horario?: string | null
          reserva_nome?: string | null
          reserva_telefone?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_mesa_pai_id_fkey"
            columns: ["mesa_pai_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          aparelho: string
          client_id: string | null
          cliente: string
          codigo: string
          created_at: string
          data_entrada: string
          hora_final: string | null
          hora_inicio: string | null
          id: string
          marca: string
          modelo: string
          observacoes: string
          problema: string
          status: string
          tecnico: string
          telefone: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          aparelho: string
          client_id?: string | null
          cliente: string
          codigo: string
          created_at?: string
          data_entrada?: string
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          marca?: string
          modelo?: string
          observacoes?: string
          problema?: string
          status?: string
          tecnico?: string
          telefone?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          aparelho?: string
          client_id?: string | null
          cliente?: string
          codigo?: string
          created_at?: string
          data_entrada?: string
          hora_final?: string | null
          hora_inicio?: string | null
          id?: string
          marca?: string
          modelo?: string
          observacoes?: string
          problema?: string
          status?: string
          tecnico?: string
          telefone?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          aceita_pedidos_online: boolean
          banner_url: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          config: Json
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          descricao: string | null
          dias_funcionamento: string[] | null
          email: string | null
          endereco: string | null
          estado: string | null
          horario_funcionamento: string | null
          id: number
          inscricao_estadual: string | null
          logo_url: string | null
          nome_estabelecimento: string
          nome_fantasia: string | null
          taxa_entrega: number
          telefone: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_suporte: string | null
        }
        Insert: {
          aceita_pedidos_online?: boolean
          banner_url?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          config?: Json
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          descricao?: string | null
          dias_funcionamento?: string[] | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: string | null
          id: number
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_estabelecimento?: string
          nome_fantasia?: string | null
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_suporte?: string | null
        }
        Update: {
          aceita_pedidos_online?: boolean
          banner_url?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          config?: Json
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          descricao?: string | null
          dias_funcionamento?: string[] | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: string | null
          id?: number
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_estabelecimento?: string
          nome_fantasia?: string | null
          taxa_entrega?: number
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_suporte?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          criado_por: string | null
          custo_unitario: number | null
          id: string
          motivo: string | null
          product_id: string
          quantidade: number
          supplier_id: string | null
          tipo: Database["public"]["Enums"]["stock_mov_tipo"]
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          custo_unitario?: number | null
          id?: string
          motivo?: string | null
          product_id: string
          quantidade: number
          supplier_id?: string | null
          tipo: Database["public"]["Enums"]["stock_mov_tipo"]
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          custo_unitario?: number | null
          id?: string
          motivo?: string | null
          product_id?: string
          quantidade?: number
          supplier_id?: string | null
          tipo?: Database["public"]["Enums"]["stock_mov_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          ativo: boolean
          categoria: string | null
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_categories: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_problems: {
        Row: {
          ativo: boolean
          category_id: string
          causas: string[] | null
          created_at: string
          descricao: string | null
          doc_url: string | null
          id: string
          imagem_url: string | null
          observacoes: string | null
          ordem: number
          passos: string[] | null
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          category_id: string
          causas?: string[] | null
          created_at?: string
          descricao?: string | null
          doc_url?: string | null
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          ordem?: number
          passos?: string[] | null
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          category_id?: string
          causas?: string[] | null
          created_at?: string
          descricao?: string | null
          doc_url?: string | null
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          ordem?: number
          passos?: string[] | null
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_problems_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ratings: {
        Row: {
          comentario: string | null
          created_at: string
          estrelas: number
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          estrelas: number
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          estrelas?: number
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          categoria_nome: string | null
          category_id: string | null
          created_at: string
          descricao_adicional: string | null
          encaminhado_whatsapp: boolean
          id: string
          problem_id: string | null
          problema_titulo: string | null
          resolvido: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria_nome?: string | null
          category_id?: string | null
          created_at?: string
          descricao_adicional?: string | null
          encaminhado_whatsapp?: boolean
          id?: string
          problem_id?: string | null
          problema_titulo?: string | null
          resolvido?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria_nome?: string | null
          category_id?: string | null
          created_at?: string
          descricao_adicional?: string | null
          encaminhado_whatsapp?: boolean
          id?: string
          problem_id?: string | null
          problema_titulo?: string | null
          resolvido?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "support_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      table_history: {
        Row: {
          action: string
          created_at: string
          criado_por: string | null
          details: Json
          id: string
          mesa_id: string
        }
        Insert: {
          action: string
          created_at?: string
          criado_por?: string | null
          details?: Json
          id?: string
          mesa_id: string
        }
        Update: {
          action?: string
          created_at?: string
          criado_por?: string | null
          details?: Json
          id?: string
          mesa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_history_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "proprietario"
        | "admin"
        | "gerente"
        | "operador"
        | "garcom"
        | "caixa"
        | "cozinha"
        | "entregador"
      cash_mov_tipo:
        | "venda"
        | "entrada"
        | "sangria"
        | "suprimento"
        | "estorno"
        | "reforco"
        | "saida"
      cash_status: "aberta" | "fechada"
      fin_status: "pago" | "pendente" | "atrasado"
      fin_tipo: "receita" | "despesa"
      order_origem: "online" | "mesa" | "pdv"
      order_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "finalizado"
        | "cancelado"
      order_tipo: "retirada" | "entrega" | "local"
      pay_method:
        | "pix"
        | "dinheiro"
        | "credito"
        | "debito"
        | "vale"
        | "credito_cliente"
        | "multiplo"
      prod_status: "planejada" | "em_producao" | "concluida" | "cancelada"
      stock_mov_tipo: "entrada" | "saida" | "ajuste" | "perda"
      table_status: "livre" | "ocupada" | "reservada" | "fechando"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "proprietario",
        "admin",
        "gerente",
        "operador",
        "garcom",
        "caixa",
        "cozinha",
        "entregador",
      ],
      cash_mov_tipo: [
        "venda",
        "entrada",
        "sangria",
        "suprimento",
        "estorno",
        "reforco",
        "saida",
      ],
      cash_status: ["aberta", "fechada"],
      fin_status: ["pago", "pendente", "atrasado"],
      fin_tipo: ["receita", "despesa"],
      order_origem: ["online", "mesa", "pdv"],
      order_status: [
        "novo",
        "confirmado",
        "em_preparo",
        "pronto",
        "saiu_entrega",
        "entregue",
        "finalizado",
        "cancelado",
      ],
      order_tipo: ["retirada", "entrega", "local"],
      pay_method: [
        "pix",
        "dinheiro",
        "credito",
        "debito",
        "vale",
        "credito_cliente",
        "multiplo",
      ],
      prod_status: ["planejada", "em_producao", "concluida", "cancelada"],
      stock_mov_tipo: ["entrada", "saida", "ajuste", "perda"],
      table_status: ["livre", "ocupada", "reservada", "fechando"],
    },
  },
} as const
