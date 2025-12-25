"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------- TYPES ---------- */
type Category = "Work" | "Health" | "Skill" | "Personal";

type Block = {
  id: number;
  title: string;
  completed: boolean;
  category: Category;
  date: string;
  isRecurring: boolean;
  order: number;
};

/* ---------- HELPERS ---------- */
const todayStr = () => new Date().toISOString().split("T")[0];

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function streak(blocks: Block[]) {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    if (blocks.some(b => b.date === date && b.completed)) s++;
    else break;
  }
  return s;
}

/* ---------- SORTABLE ---------- */
function SortableBlock({
  block,
  children,
}: {
  block: Block;
  children: (props: {
    setActivatorNodeRef: any;
    listeners: any;
  }) => React.ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    transform,
    transition,
    attributes,
  } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
    >
      {children({ setActivatorNodeRef, listeners })}
    </div>
  );
}

/* ---------- COMPONENT ---------- */
export default function Home() {
  const today = todayStr();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [newBlock, setNewBlock] = useState("");
  const [category, setCategory] = useState<Category>("Work");
  const [isRecurring, setIsRecurring] = useState(false);

  /* STORAGE */
  useEffect(() => {
    const saved = localStorage.getItem("blocks");
    if (saved) setBlocks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("blocks", JSON.stringify(blocks));
  }, [blocks]);

  /* RECURRING */
  useEffect(() => {
    const templates = blocks.filter(b => b.isRecurring && b.date !== today);
    const existsToday = blocks.some(b => b.isRecurring && b.date === today);
    if (existsToday) return;

    const generated = templates.map(b => ({
      ...b,
      id: Date.now() + Math.random(),
      completed: false,
      date: today,
    }));

    if (generated.length) {
      setBlocks(prev => [...prev, ...generated]);
    }
  }, [today]); // eslint-disable-line

  /* DERIVED */
  const todaysBlocks = blocks
    .filter(b => b.date === today)
    .sort((a, b) => a.order - b.order);

  const completed = todaysBlocks.filter(b => b.completed).length;
  const progress =
    todaysBlocks.length === 0
      ? 0
      : Math.round((completed / todaysBlocks.length) * 100);

  const weeklyData = last7Days().map(d => ({
    date: d.slice(5),
    completed: blocks.filter(b => b.date === d && b.completed).length,
  }));

  /* ACTIONS */
  function addBlock() {
    if (!newBlock.trim()) return;
    setBlocks(prev => [
      ...prev,
      {
        id: Date.now(),
        title: newBlock,
        completed: false,
        category,
        date: today,
        isRecurring,
        order: todaysBlocks.length,
      },
    ]);
    setNewBlock("");
    setIsRecurring(false);
  }

  function toggleBlock(id: number) {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, completed: !b.completed } : b))
    );
  }

  function deleteBlock(id: number) {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks(prev => {
      const todayItems = prev
        .filter(b => b.date === today)
        .sort((a, b) => a.order - b.order);

      const oldIndex = todayItems.findIndex(b => b.id === active.id);
      const newIndex = todayItems.findIndex(b => b.id === over.id);

      const reordered = [...todayItems];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updated = reordered.map((b, i) => ({ ...b, order: i }));
      const others = prev.filter(b => b.date !== today);

      return [...others, ...updated];
    });
  }

  /* UI */
  return (
    <main className="min-h-screen max-w-xl mx-auto p-6 bg-white text-black">
      {/* ↑ THIS LINE FORCES BLACK EVERYWHERE */}

      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="text-sm">{new Date().toDateString()}</p>

      <input
        className="mt-4 w-full rounded-xl border border-black px-4 py-3 text-sm font-medium placeholder:text-black focus:ring-2 focus:ring-black outline-none"
        placeholder="What will you execute next?"
        value={newBlock}
        onChange={e => setNewBlock(e.target.value)}
        onKeyDown={e => e.key === "Enter" && addBlock()}
      />

      <div className="mt-3 flex gap-2 text-xs">
        {(["Work", "Health", "Skill", "Personal"] as Category[]).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full border border-black ${
              category === c ? "bg-black text-white" : ""
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={e => setIsRecurring(e.target.checked)}
        />
        Repeat daily
      </label>

      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Daily Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-black/20 rounded-full">
          <div
            className="h-full bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between border border-black rounded-xl px-4 py-3">
        <span className="text-sm">Consistency</span>
        <span className="font-semibold">{streak(blocks)} days</span>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={todaysBlocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-6 space-y-3">
            {todaysBlocks.map(block => (
              <SortableBlock key={block.id} block={block}>
                {({ setActivatorNodeRef, listeners }) => (
                  <div className="flex justify-between items-center border border-black rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        ref={setActivatorNodeRef}
                        {...listeners}
                        className="cursor-grab select-none"
                      >
                        ☰
                      </div>

                      <input
                        type="checkbox"
                        checked={block.completed}
                        onChange={() => toggleBlock(block.id)}
                      />

                      <div>
                        <div
                          className={
                            block.completed
                              ? "line-through opacity-60"
                              : ""
                          }
                        >
                          {block.title}
                        </div>
                        <div className="text-xs">
                          {block.category}
                          {block.isRecurring && " • Daily"}
                        </div>
                      </div>
                    </div>

                    <button onClick={() => deleteBlock(block.id)}>✕</button>
                  </div>
                )}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <details className="mt-10">
        <summary className="cursor-pointer text-sm">
          View weekly analytics
        </summary>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" aspect={2}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="completed" fill="#000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </details>
    </main>
  );
}
