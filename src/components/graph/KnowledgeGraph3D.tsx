"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GraphNode, GraphLink } from "@/app/api/graph/route";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Maximize2,
  Sparkles,
  Search,
  Filter,
} from "lucide-react";

interface Node3D extends GraphNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  screenX: number;
  screenY: number;
  screenR: number;
  visible: boolean;
}

interface Link3D {
  sourceId: string;
  targetId: string;
  sourceNode?: Node3D;
  targetNode?: Node3D;
  label?: string;
  pulseProgress: number; // 0 to 1 for synaptic signal animation
  pulseSpeed: number;
}

export function KnowledgeGraph3D({
  rawNodes,
  rawLinks,
  selectedNode,
  onSelectNode,
}: {
  rawNodes: GraphNode[];
  rawLinks: GraphLink[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter & Search State
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);

  // Simulation & 3D state refs
  const nodesRef = useRef<Node3D[]>([]);
  const linksRef = useRef<Link3D[]>([]);
  const hoveredNodeRef = useRef<Node3D | null>(null);

  // Camera angles
  const rotRef = useRef({ x: 0.25, y: 0.35 });
  const velRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Initialize 3D physics nodes from raw data
  useEffect(() => {
    const radius = 220;
    const count = rawNodes.length;

    const initialNodes: Node3D[] = rawNodes.map((n, i) => {
      // Fibonacci sphere distribution for uniform 3D spacing
      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(count, 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = radius * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 40;
      const y = radius * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 40;
      const z = radius * Math.cos(phi) + (Math.random() - 0.5) * 40;

      return {
        ...n,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        screenX: 0,
        screenY: 0,
        screenR: 0,
        visible: true,
      };
    });

    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));

    const initialLinks: Link3D[] = rawLinks
      .map((l) => ({
        sourceId: l.source,
        targetId: l.target,
        sourceNode: nodeMap.get(l.source),
        targetNode: nodeMap.get(l.target),
        label: l.label,
        pulseProgress: Math.random(),
        pulseSpeed: 0.006 + Math.random() * 0.008,
      }))
      .filter((l) => l.sourceNode && l.targetNode);

    nodesRef.current = initialNodes;
    linksRef.current = initialLinks;
  }, [rawNodes, rawLinks]);

  // Update visibility based on filter and search
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    nodesRef.current.forEach((n) => {
      const matchType = filterType === "all" || n.type === filterType;
      const matchSearch =
        !q ||
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        Boolean(n.details?.subtitle?.toLowerCase().includes(q)) ||
        Boolean(n.details?.description?.toLowerCase().includes(q));

      n.visible = Boolean(matchType && matchSearch);
    });
  }, [filterType, searchQuery]);

  // Main 3D Rendering & Physics Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 600 * zoomRef.current;

      // 1. Camera Auto-rotation & Inertia
      if (autoRotate && !isDraggingRef.current) {
        rotRef.current.y += 0.0025;
      }
      rotRef.current.x += velRef.current.x;
      rotRef.current.y += velRef.current.y;
      velRef.current.x *= 0.92;
      velRef.current.y *= 0.92;

      // Clamp X tilt
      rotRef.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotRef.current.x));

      const cosX = Math.cos(rotRef.current.x);
      const sinX = Math.sin(rotRef.current.x);
      const cosY = Math.cos(rotRef.current.y);
      const sinY = Math.sin(rotRef.current.y);

      // 2. Physics Step (Repulsion + Spring Attraction + Centering)
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          if (!n1.visible || !n2.visible) continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dz = n2.z - n1.z;
          const distSq = dx * dx + dy * dy + dz * dz + 100;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = 180 / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n1.vz -= fz;
            n2.vx += fx;
            n2.vy += fy;
            n2.vz += fz;
          }
        }
      }

      // Spring attraction along links
      for (const link of links) {
        const s = link.sourceNode;
        const t = link.targetNode;
        if (!s || !t || !s.visible || !t.visible) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dz = t.z - s.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const targetDist = 120;
        const force = (dist - targetDist) * 0.003;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        s.vx += fx;
        s.vy += fy;
        s.vz += fz;
        t.vx -= fx;
        t.vy -= fy;
        t.vz -= fz;
      }

      // Center gravity & update position
      for (const n of nodes) {
        // Centering pull
        n.vx -= n.x * 0.001;
        n.vy -= n.y * 0.001;
        n.vz -= n.z * 0.001;

        // Friction damping
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.vz *= 0.88;

        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;

        // 3D Projection to screen coordinates
        // Rotate around Y then X
        const x1 = n.x * cosY + n.z * sinY;
        const z1 = -n.x * sinY + n.z * cosY;

        const y2 = n.y * cosX - z1 * sinX;
        const z2 = n.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 350);

        n.screenX = centerX + x1 * scale;
        n.screenY = centerY + y2 * scale;
        n.screenR = Math.max(3, n.val * scale);
        (n as any).depth = z2; // for z-sorting
      }

      // 3. Clear Screen (Pure OLED black)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient depth grid / star particles
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      for (let s = 0; s < 40; s++) {
        const sx = ((s * 137.5) % width);
        const sy = ((s * 269.3) % height);
        ctx.fillRect(sx, sy, 1, 1);
      }

      const activeHovered = hoveredNodeRef.current;
      const isFilterActive = !!activeHovered || !!selectedNode;

      // 4. Render 3D Edges / Links with Synaptic Pulse Signals
      for (const link of links) {
        const s = link.sourceNode;
        const t = link.targetNode;
        if (!s || !t || !s.visible || !t.visible) continue;

        const isConnectedToHover =
          activeHovered && (s.id === activeHovered.id || t.id === activeHovered.id);
        const isConnectedToSelect =
          selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);

        let strokeColor = "rgba(255, 255, 255, 0.12)";
        let lineWidth = 1;

        if (isConnectedToHover || isConnectedToSelect) {
          strokeColor = "rgba(255, 255, 255, 0.65)";
          lineWidth = 2;
        } else if (isFilterActive) {
          strokeColor = "rgba(255, 255, 255, 0.03)";
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(s.screenX, s.screenY);
        ctx.lineTo(t.screenX, t.screenY);
        ctx.stroke();

        // Synaptic Signal Pulse Particle
        link.pulseProgress = (link.pulseProgress + link.pulseSpeed) % 1;
        const px = s.screenX + (t.screenX - s.screenX) * link.pulseProgress;
        const py = s.screenY + (t.screenY - s.screenY) * link.pulseProgress;

        ctx.fillStyle = isConnectedToHover || isConnectedToSelect ? "#ffffff" : s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Render 3D Nodes (Sorted back-to-front by depth)
      const sortedNodes = [...nodes]
        .filter((n) => n.visible)
        .sort((a, b) => (b as any).depth - (a as any).depth);

      for (const node of sortedNodes) {
        const isHovered = activeHovered?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        const isNeighbor =
          activeHovered &&
          links.some(
            (l) =>
              (l.sourceId === activeHovered.id && l.targetId === node.id) ||
              (l.targetId === activeHovered.id && l.sourceId === node.id)
          );

        let opacity = 0.9;
        if (isFilterActive && !isHovered && !isSelected && !isNeighbor) {
          opacity = 0.2;
        }

        ctx.globalAlpha = opacity;

        // Outer Glow Halo
        const glowR = node.screenR * (isHovered || isSelected ? 2.4 : 1.6);
        const radGlow = ctx.createRadialGradient(
          node.screenX,
          node.screenY,
          node.screenR * 0.4,
          node.screenX,
          node.screenY,
          glowR
        );
        radGlow.addColorStop(0, node.color);
        radGlow.addColorStop(1, "transparent");

        ctx.fillStyle = radGlow;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Core Solid Node Sphere
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, node.screenR, 0, Math.PI * 2);
        ctx.fill();

        // Center bright highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          node.screenX - node.screenR * 0.25,
          node.screenY - node.screenR * 0.25,
          node.screenR * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Node Label
        const shouldShowLabel =
          isHovered || isSelected || isNeighbor || node.val >= 14 || zoomRef.current > 1.2;

        if (shouldShowLabel) {
          ctx.font = isHovered || isSelected ? "bold 11px Inter, sans-serif" : "10px Inter, sans-serif";
          ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.75)";
          ctx.textAlign = "center";
          ctx.fillText(
            node.label.length > 28 ? node.label.slice(0, 26) + "..." : node.label,
            node.screenX,
            node.screenY + node.screenR + 13
          );
        }

        ctx.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [autoRotate, selectedNode]);

  // Pointer / Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      velRef.current = { x: dy * 0.005, y: dx * 0.005 };
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }

    // Hover detection
    let hit: Node3D | null = null;
    for (const n of nodesRef.current) {
      if (!n.visible) continue;
      const dist = Math.hypot(n.screenX - mouseX, n.screenY - mouseY);
      if (dist <= n.screenR + 6) {
        hit = n;
        break;
      }
    }
    hoveredNodeRef.current = hit;
    canvas.style.cursor = hit ? "pointer" : isDraggingRef.current ? "grabbing" : "grab";
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNodeRef.current) {
      onSelectNode(hoveredNodeRef.current);
    } else {
      onSelectNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomRef.current = Math.max(0.5, Math.min(2.5, zoomRef.current * factor));
  };

  const handleResetCamera = () => {
    rotRef.current = { x: 0.25, y: 0.35 };
    velRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
  };

  const handleScatterReheat = () => {
    nodesRef.current.forEach((n) => {
      n.vx += (Math.random() - 0.5) * 8;
      n.vy += (Math.random() - 0.5) * 8;
      n.vz += (Math.random() - 0.5) * 8;
    });
  };

  return (
    <div className="relative w-full h-[620px] rounded-3xl bg-black border border-zinc-800 overflow-hidden shadow-2xl flex flex-col select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Search Input */}
        <div className="relative pointer-events-auto flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts or nodes..."
            className="bg-[#0a0a0a]/90 backdrop-blur-md border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors w-48 sm:w-64"
          />
        </div>

        {/* Category Filters */}
        <div className="pointer-events-auto flex rounded-xl bg-[#0a0a0a]/90 backdrop-blur-md border border-zinc-800 p-1 text-[11px] gap-1 overflow-x-auto max-w-full">
          {[
            { id: "all", label: "All Nodes" },
            { id: "paper", label: "🟣 Papers" },
            { id: "topic", label: "🟢 Topics" },
            { id: "project", label: "🔵 Projects" },
            { id: "note", label: "🟡 Notes" },
            { id: "goal", label: "🔴 Goals" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === cat.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 3D Action Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#0a0a0a]/90 backdrop-blur-md border border-zinc-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg transition-colors ${
              autoRotate ? "text-white bg-zinc-800" : "text-zinc-500 hover:text-white"
            }`}
            title={autoRotate ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              zoomRef.current = Math.min(2.5, zoomRef.current * 1.15);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              zoomRef.current = Math.max(0.5, zoomRef.current * 0.85);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Reset 3D Perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleScatterReheat}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Re-balance Graph Physics"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full block touch-none"
      />

      {/* Bottom Floating Legend / Instructions */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 text-[11px] text-zinc-500 font-mono pointer-events-none">
        <span>🖱️ Drag to rotate 3D orbit</span>
        <span>•</span>
        <span>Scroll to zoom</span>
        <span>•</span>
        <span>Click node to inspect</span>
      </div>
    </div>
  );
}
