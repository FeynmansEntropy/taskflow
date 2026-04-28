"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Card = {
  id: string;
  title: string;
  description: string;
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
};

const initialColumns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    cards: [
      {
        id: "1",
        title: "Create project structure",
        description: "Set up Next.js, React, and Tailwind CSS.",
      },
      {
        id: "2",
        title: "Design Kanban board",
        description: "Create columns and task cards.",
      },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    cards: [
      {
        id: "3",
        title: "Implement drag and drop",
        description: "Move cards between columns with dnd-kit.",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      {
        id: "4",
        title: "Deploy project",
        description: "Publish the application on Vercel.",
      },
    ],
  },
];

function DroppableColumn({
  column,
  children,
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[420px] rounded-2xl border p-4 shadow-lg transition ${
        isOver
          ? "border-blue-500 bg-slate-800"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{column.title}</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          {column.cards.length} cards
        </span>
      </div>
      {children}
    </div>
  );
}

function DraggableCard({
  card,
  isEditing,
  children,
}: {
  card: Card;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      disabled: isEditing,
    });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-md transition hover:border-blue-500"
    >
      {!isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="mb-3 inline-flex touch-none select-none items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 active:cursor-grabbing"
        >
          <span className="text-slate-500">☰</span>
          <span>Drag</span>
        </div>
      )}

      {children}
    </div>
  );
}

export default function Home() {
  const [userName, setUserName] = useState("");
  const [loginName, setLoginName] = useState("");
  const [boardName, setBoardName] = useState("Product Sprint Board");

  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("taskflow-user");
    const savedBoardName = localStorage.getItem("taskflow-board-name");
    const savedColumns = localStorage.getItem("taskflow-columns");

    if (savedUser) setUserName(savedUser);
    if (savedBoardName) setBoardName(savedBoardName);
    if (savedColumns) setColumns(JSON.parse(savedColumns));
  }, []);

  useEffect(() => {
    localStorage.setItem("taskflow-columns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem("taskflow-board-name", boardName);
  }, [boardName]);

  function login() {
    if (!loginName.trim()) return;
    setUserName(loginName);
    localStorage.setItem("taskflow-user", loginName);
  }

  function logout() {
    setUserName("");
    setLoginName("");
    localStorage.removeItem("taskflow-user");
  }

  function addCard() {
    if (!newCardTitle.trim()) return;

    const newCard: Card = {
      id: Date.now().toString(),
      title: newCardTitle,
      description: newCardDescription || "No description added.",
    };

    setColumns((prev) =>
      prev.map((column) =>
        column.id === "todo"
          ? { ...column, cards: [...column.cards, newCard] }
          : column
      )
    );

    setNewCardTitle("");
    setNewCardDescription("");
  }

  function deleteCard(cardId: string) {
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId),
      }))
    );
  }

  function startEditing(card: Card) {
    setEditingCardId(card.id);
    setEditingTitle(card.title);
    setEditingDescription(card.description);
  }

  function cancelEditing() {
    setEditingCardId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function saveEditing(cardId: string) {
    if (!editingTitle.trim()) return;

    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                title: editingTitle,
                description: editingDescription || "No description added.",
              }
            : card
        ),
      }))
    );

    cancelEditing();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const cardId = String(active.id);
    const targetColumnId = String(over.id);

    let movedCard: Card | undefined;
    let sourceColumnId: string | undefined;

    const columnsWithoutCard = columns.map((column) => {
      const card = column.cards.find((item) => item.id === cardId);

      if (card) {
        movedCard = card;
        sourceColumnId = column.id;

        return {
          ...column,
          cards: column.cards.filter((item) => item.id !== cardId),
        };
      }

      return column;
    });

    if (!movedCard || sourceColumnId === targetColumnId) return;

    setColumns(
      columnsWithoutCard.map((column) =>
        column.id === targetColumnId
          ? { ...column, cards: [...column.cards, movedCard as Card] }
          : column
      )
    );
  }

  function resetBoard() {
    setColumns(initialColumns);
    setBoardName("Product Sprint Board");
    cancelEditing();
  }

  if (!userName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm font-medium text-blue-300">TaskFlow</p>
          <h1 className="mt-2 text-4xl font-bold">Welcome back</h1>
          <p className="mt-3 text-slate-400">
            Sign in to create and manage your Kanban project board.
          </p>

          <div className="mt-8 space-y-3">
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              onClick={login}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Continue to Board
            </button>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Demo authentication is stored locally in the browser.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-300">TaskFlow</p>
            <h1 className="text-4xl font-bold tracking-tight">
              Smart Team Kanban Board
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Create, edit, delete, and organize tasks across workflow columns.
              Drag-and-drop is powered by dnd-kit for better mobile support.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
              Signed in as{" "}
              <span className="font-semibold text-white">{userName}</span>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Logout
            </button>

            <button
              onClick={resetBoard}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Reset Board
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Board Name
          </label>
          <input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-semibold outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Add New Task</h2>

          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Task title"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <input
              value={newCardDescription}
              onChange={(e) => setNewCardDescription(e.target.value)}
              placeholder="Task description"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              onClick={addCard}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Add Task
            </button>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-2xl font-bold">{boardName}</h2>
          <p className="text-sm text-slate-500">
            Drag cards between columns to update task status.
          </p>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-5 md:grid-cols-3">
            {columns.map((column) => (
              <DroppableColumn key={column.id} column={column}>
                <div className="space-y-3">
                  {column.cards.map((card) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      isEditing={editingCardId === card.id}
                    >
                      {editingCardId === card.id ? (
                        <div className="space-y-3">
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />

                          <textarea
                            value={editingDescription}
                            onChange={(e) =>
                              setEditingDescription(e.target.value)
                            }
                            className="h-24 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />

                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditing(card.id)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold hover:bg-green-500"
                            >
                              Save
                            </button>

                            <button
                              onClick={cancelEditing}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold">{card.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {card.description}
                          </p>

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => startEditing(card)}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteCard(card.id)}
                              className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </DraggableCard>
                  ))}

                  {column.cards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                      Drop cards here
                    </div>
                  )}
                </div>
              </DroppableColumn>
            ))}
          </div>
        </DndContext>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          Built by Sami Yorulmaz | Internship Challenge 2026
        </footer>
      </section>
    </main>
  );
}