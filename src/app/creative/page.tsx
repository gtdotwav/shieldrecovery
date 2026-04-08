'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import Image from 'next/image';
import { platformBrand } from '@/lib/platform';

export default function CreativePage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-[var(--accent)] selection:text-black">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[var(--accent)]/20 blur-[120px] mix-blend-screen opacity-60"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[var(--accent)]/10 blur-[150px] mix-blend-screen opacity-50"></div>
        <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-[var(--accent)]/15 blur-[100px] mix-blend-screen opacity-40"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-16 relative z-10 min-h-screen flex flex-col justify-center">

        {/* Header/Logo Area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute top-8 left-6 lg:left-12 flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong,var(--accent))] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 line-clamp-1">
            <Zap className="w-6 h-6 text-black fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            {platformBrand.name}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center mt-12 lg:mt-0">

          {/* Text Content - Left Side */}
          <div className="flex flex-col space-y-8 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
                <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                <span className="text-sm font-medium text-[var(--accent)]">Nova IA de Recuperacao Ativa</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6 mt-2">
                Dinheiro na mesa? <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent-strong,var(--accent))]">
                  Nos buscamos para voce.
                </span>
              </h1>

              <p className="text-xl text-zinc-400 max-w-xl leading-relaxed font-light">
                Esqueca os Pix nao pagos e carrinhos abandonados. O agente inteligente da {platformBrand.name} trabalha 24/7 para converter suas vendas perdidas e turbinar seu faturamento.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Link href="/quiz" className="group relative px-8 py-4 bg-[var(--accent)] hover:brightness-110 text-black font-bold rounded-2xl transition-all duration-300 hover:shadow-[0_0_40px_-10px_var(--accent-glow,rgba(var(--accent-rgb),0.6))] hover:-translate-y-1 overflow-hidden inline-flex items-center justify-center">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="relative flex items-center justify-center space-x-2">
                  <span>Ativar Agente Agora</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <Link href="/quiz" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl border border-white/10 transition-all duration-300 flex items-center justify-center space-x-2 backdrop-blur-sm">
                <span>Ver Demonstracao</span>
              </Link>
            </motion.div>

            {/* Metrics/Trust */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="grid grid-cols-2 gap-4 sm:gap-8 pt-8 mt-4 border-t border-white/10"
            >
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2 text-[var(--accent)]">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-3xl font-black">+35%</span>
                </div>
                <span className="text-sm text-zinc-500 font-medium">Recuperacao Media</span>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2 text-[var(--accent)]">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-3xl font-black">24/7</span>
                </div>
                <span className="text-sm text-zinc-500 font-medium">Automacao Ininterrupta</span>
              </div>
            </motion.div>
          </div>

          {/* Image/Mascot Content - Right Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, type: 'spring', bounce: 0.4 }}
            className="order-1 lg:order-2 relative w-full min-h-[50vh] lg:min-h-[80vh] flex items-center justify-center"
          >
            {/* The Mascot */}
            <div className="relative w-full h-[500px] lg:h-[700px] max-w-2xl mx-auto flex items-center justify-center">
              {/* Glow behind the mascot */}
              <div className="absolute inset-0 bg-[var(--accent)]/10 blur-[80px] rounded-full"></div>

              <Image
                src="/mascot.png"
                alt={`${platformBrand.name} Agent Character`}
                fill
                priority
                className="object-contain object-center drop-shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)] filter contrast-[1.05]"
              />

              {/* Liquid glass floating cards to complement the creative */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] lg:top-[20%] -left-2 lg:-left-12 px-5 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-[var(--accent)]/20 p-2 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide border-b-transparent uppercase line-clamp-1">Pix Recuperado</p>
                    <p className="text-lg font-bold text-white leading-none whitespace-nowrap">R$ 497,90</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[10%] lg:bottom-[15%] -right-2 lg:-right-8 px-5 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-[var(--accent)] p-2 rounded-lg shadow-[0_0_15px_var(--accent-glow,rgba(var(--accent-rgb),0.5))]">
                    <TrendingUp className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide border-b-transparent uppercase line-clamp-1">Conversao Hoje</p>
                    <p className="text-lg font-bold text-white whitespace-nowrap leading-none">+ 238 vendas</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
