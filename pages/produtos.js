// pages/produtos.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// 👇 FUNÇÃO AUXILIAR SEGURA PARA TRIM
function safeTrim(value) {
  try {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
    if (typeof value === "object") return JSON.stringify(value).trim();
    return String(value).trim();
  } catch {
    return "";
  }
}

export default function ProductsPage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  // Campos do formulário
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(""); // guarda a URL atual da imagem
  const [saving, setSaving] = useState(false);

  // Edição
  const [editingId, setEditingId] = useState(null);

  // 1) Carrega usuário logado
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        // se não estiver logado, manda pro login
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  // 2) Buscar produtos do usuário logado
  async function fetchProducts() {
    if (!user) return;

    try {
      setLoadingProducts(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id) // 👈 só produtos deste usuário
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        setError("Erro ao carregar produtos.");
        return;
      }

      setProducts(data || []);
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao carregar produtos.");
    } finally {
      setLoadingProducts(false);
    }
  }

  // Carrega produtos quando já temos o usuário
  useEffect(() => {
    if (!user) return;
    fetchProducts();
  }, [user]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImageFile(null);
    setImageUrl("");
    setEditingId(null);
  }

  // 3) Criar / atualizar produto (com upload de imagem opcional)
  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;

    setError("");
    setSaving(true);

    try {
      // 👇 USANDO safeTrim() AQUI
      if (!safeTrim(name)) {
        setError("Informe pelo menos o nome do produto/serviço.");
        setSaving(false);
        return;
      }

      const parsedPrice = price ? Number(price.replace(",", ".")) : null;

      // URL final da imagem (pode ser a antiga ou uma nova)
      let finalImageUrl = imageUrl || null;

      // 3.1) Se tiver nova imagem selecionada, faz upload no Storage
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error("Erro ao fazer upload da imagem:", uploadError);
          setError("Erro ao enviar a imagem. Tente novamente.");
          setSaving(false);
          return;
        }

        // Pega URL pública
        const { data: publicData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        finalImageUrl = publicData?.publicUrl || finalImageUrl;
      }

      if (editingId) {
        // 👇 UPDATE COM safeTrim()
        const { error } = await supabase
          .from("products")
          .update({
            name: safeTrim(name),
            description: safeTrim(description) || null,
            price: parsedPrice,
            category: safeTrim(category) || null,
            image_url: finalImageUrl,
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Erro ao atualizar produto:", error);
          setError(error.message || "Erro ao atualizar produto.");
          setSaving(false);
          return;
        }
      } else {
        // 👇 INSERT COM safeTrim()
        const { error } = await supabase.from("products").insert({
          user_id: user.id,
          name: safeTrim(name),
          description: safeTrim(description) || null,
          price: parsedPrice,
          category: safeTrim(category) || null,
          is_active: true,
          image_url: finalImageUrl,
        });

        if (error) {
          console.error("Erro ao criar produto:", error);
          setError(error.message || "Erro ao criar produto.");
          setSaving(false);
          return;
        }
      }

      // Limpa formulário
      resetForm();

      // Recarrega lista
      fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  // 4) Ativar / desativar produto
  async function toggleActive(product) {
    try {
      setError("");

      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id)
        .eq("user_id", user.id); // segurança extra

      if (error) {
        console.error("Erro ao atualizar produto:", error);
        setError("Erro ao atualizar status do produto.");
        return;
      }

      // Atualiza lista
      fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao atualizar produto.");
    }
  }

  // 5) Remover produto
  async function handleDeleteProduct(product) {
    if (!window.confirm(`Deseja realmente remover "${product.name}"?`)) {
      return;
    }

    try {
      setError("");

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao remover produto:", error);
        setError("Erro ao remover produto.");
        return;
      }

      fetchProducts();
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao remover produto.");
    }
  }

  // 6) Editar produto (preenche o formulário)
  function startEdit(product) {
    setEditingId(product.id);
    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(
      product.price != null
        ? String(product.price).replace(".", ",")
        : ""
    );
    setCategory(product.category || "");
    setImageUrl(product.image_url || "");
    setImageFile(null); // não traz arquivo, só mantemos a URL até o usuário escolher outra imagem
  }

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  }

  const isEditing = Boolean(editingId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      {/* Topo */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>
            InfinixAI – Produtos & Serviços
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Cadastre seus produtos e serviços. A InfinixAI vai usar essa lista
            como base para responder dúvidas de clientes e sugerir opções.
          </p>
        </div>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ color: "#64748b" }}>Logado como:</div>
          <div>{user?.email}</div>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #f97316",
            background: "#451a03",
            color: "#fed7aa",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Grid: formulário + lista */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) 1fr",
          gap: 16,
        }}
      >
        {/* Formulário */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>
            {isEditing ? "Editar produto / serviço" : "Novo produto / serviço"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
              Nome *
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Corte de cabelo feminino, Redmi Note 13..."
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
              Descrição
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ex: Tela 120Hz, 256GB, 8GB RAM, ótimo para jogos..."
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <label style={{ flex: 1, fontSize: 14 }}>
                Preço (R$)
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 1599,90"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ flex: 1, fontSize: 14 }}>
                Categoria
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Celular, Serviço, Acessório..."
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    fontSize: 14,
                  }}
                />
              </label>
            </div>

            <label style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
              Foto do produto (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImageFile(file || null);
                }}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 4,
                  borderRadius: 8,
                  border: "1px solid #1e293b",
                  background: "#020617",
                  color: "#e2e8f0",
                  fontSize: 14,
                }}
              />
              {imageUrl && !imageFile && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#a3a3a3",
                    marginTop: 4,
                    display: "block",
                  }}
                >
                  Já existe uma imagem cadastrada para este produto. Selecione um
                  novo arquivo para substituir.
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginTop: 4,
                  display: "block",
                }}
              >
                Formatos recomendados: JPG ou PNG. Tamanho pequeno (até 1MB) é
                ideal.
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: saving ? "#082f49" : "#22c55e",
                color: "#0b1120",
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                fontSize: 15,
              }}
            >
              {saving
                ? "Salvando..."
                : isEditing
                ? "Salvar alterações"
                : "Adicionar produto"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #1e293b",
                  background: "transparent",
                  color: "#e2e8f0",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancelar edição
              </button>
            )}
          </form>
        </section>

        {/* Lista de produtos */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid #1e293b",
            background: "#020617",
            padding: 16,
            minHeight: 200,
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>
            Produtos cadastrados
          </h2>

          {loadingProducts ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Carregando...</p>
          ) : products.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Nenhum produto cadastrado ainda.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: "70vh",
                overflowY: "auto",
              }}
            >
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #1e293b",
                    padding: 10,
                    background: "#020617",
                    opacity: p.is_active ? 1 : 0.4,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                    {/* Miniatura da imagem */}
                    {p.image_url && (
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid #1e293b",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {p.name}
                      </div>
                      {p.category && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#a3a3a3",
                            marginBottom: 4,
                          }}
                        >
                          {p.category}
                        </div>
                      )}
                      {p.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#cbd5f5",
                            marginBottom: 4,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {p.description}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#a3a3a3" }}>
                        {p.price != null &&
                          `Preço: R$ ${Number(p.price).toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                      minWidth: 160,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid #1e293b",
                        background: p.is_active ? "#0f766e" : "#1f2937",
                        color: p.is_active ? "#bbf7d0" : "#e5e7eb",
                      }}
                    >
                      {p.is_active ? "Ativo (em estoque)" : "Inativo (sem estoque)"}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleActive(p)}
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #1e293b",
                        background: "transparent",
                        color: "#e2e8f0",
                        cursor: "pointer",
                      }}
                    >
                      {p.is_active ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #1e293b",
                        background: "transparent",
                        color: "#0ea5e9",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid #7f1d1d",
                        background: "#450a0a",
                        color: "#fecaca",
                        cursor: "pointer",
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
