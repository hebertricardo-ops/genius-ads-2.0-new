import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export interface EditMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  editId?: string;
  createdAt: Date;
}

export interface EditVersion {
  editId: string | null; // null = original
  imageUrl: string;
  label: string;
  createdAt: Date;
}

interface UseCreativeEditorReturn {
  messages: EditMessage[];
  versions: EditVersion[];
  currentImageUrl: string;
  activeVersionIdx: number;
  selectedElement: string;
  isLoading: boolean;
  setSelectedElement: (el: string) => void;
  sendMessage: (params: {
    userMessage: string;
    editElement: string;
    originalCreativeId: string;
    brandId?: string | null;
    format?: string;
  }) => Promise<void>;
  selectVersion: (idx: number) => void;
}

export function useCreativeEditor(initialImageUrl: string): UseCreativeEditorReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<EditMessage[]>([
    {
      role: "assistant",
      content: "Olá! Selecione o elemento que deseja alterar e me descreva o que precisa mudar. Farei a edição preservando a identidade visual do criativo.",
      createdAt: new Date(),
    },
  ]);

  const [versions, setVersions] = useState<EditVersion[]>([
    {
      editId: null,
      imageUrl: initialImageUrl,
      label: "Original",
      createdAt: new Date(),
    },
  ]);

  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [selectedElement, setSelectedElement] = useState("free");
  const [isLoading, setIsLoading] = useState(false);

  const currentImageUrl = versions[activeVersionIdx]?.imageUrl ?? initialImageUrl;

  const sendMessage = useCallback(
    async ({
      userMessage,
      editElement,
      originalCreativeId,
      brandId,
      format,
    }: {
      userMessage: string;
      editElement: string;
      originalCreativeId: string;
      brandId?: string | null;
      format?: string;
    }) => {
      if (!user || !userMessage.trim()) return;

      const userMsg: EditMessage = {
        role: "user",
        content: userMessage,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada");

        const sourceImageUrl = currentImageUrl;

        const parentEditId = versions[activeVersionIdx]?.editId ?? null;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-creative`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              original_creative_id: originalCreativeId,
              parent_edit_id: parentEditId,
              source_image_url: sourceImageUrl,
              edit_element: editElement,
              user_message: userMessage,
              brand_id: brandId ?? null,
              format: format ?? "1:1",
            }),
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || `Erro ${res.status}`);
        }

        const { edit_id, result_image_url } = json as {
          edit_id: string;
          result_image_url: string;
        };

        const newVersion: EditVersion = {
          editId: edit_id,
          imageUrl: result_image_url,
          label: `Edição ${versions.length}`,
          createdAt: new Date(),
        };

        setVersions((prev) => [...prev, newVersion]);
        setActiveVersionIdx((prev) => prev + 1);

        const assistantMsg: EditMessage = {
          role: "assistant",
          content: "Edição aplicada! Veja o resultado ao lado. Se quiser ajustar algo mais, é só me dizer.",
          imageUrl: result_image_url,
          editId: edit_id,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        queryClient.invalidateQueries({ queryKey: ["credits"] });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        const assistantError: EditMessage = {
          role: "assistant",
          content: `Ocorreu um erro ao processar a edição: ${errorMsg}`,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantError]);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentImageUrl, versions, activeVersionIdx, queryClient]
  );

  const selectVersion = useCallback((idx: number) => {
    setActiveVersionIdx(idx);
  }, []);

  return {
    messages,
    versions,
    currentImageUrl,
    activeVersionIdx,
    selectedElement,
    isLoading,
    setSelectedElement,
    sendMessage,
    selectVersion,
  };
}
