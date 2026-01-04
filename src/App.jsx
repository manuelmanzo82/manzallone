import React, { useState, useEffect } from 'react';

// ============================================
// MANZALLONE - App Coppia per Tracking Salute
// Con Supabase per sync tra dispositivi
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://kgppsiztemxgkbzmgtxf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JfCylmy0xPC8Lb5nfVtN6g_5NT6z8Gy';

// Supabase client semplificato
const supabase = {
  from: (table) => ({
    select: async (columns = '*') => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    update: async (updates) => ({
      eq: async (column, value) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      },
      match: async (matchObj) => {
        const params = Object.entries(matchObj).map(([k, v]) => `${k}=eq.${v}`).join('&');
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      },
    }),
    upsert: async (rows, onConflict = null) => {
      // Se onConflict è specificato, aggiungi il parametro alla URL
      let url = `${SUPABASE_URL}/rest/v1/${table}`;
      if (onConflict) {
        url += `?on_conflict=${onConflict}`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    delete: async () => ({
      match: async (matchObj) => {
        const params = Object.entries(matchObj).map(([k, v]) => `${k}=eq.${v}`).join('&');
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        });
        return { error: res.ok ? null : await res.json() };
      },
    }),
  }),
};

// Helper per ottenere la data di oggi in formato YYYY-MM-DD
const getToday = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper per ottenere l'inizio della settimana (lunedì)
const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// Design Tokens
const tokens = {
  colors: {
    // Base
    bg: '#0D0D0D',
    bgCard: '#161616',
    bgElevated: '#1C1C1C',
    bgHover: '#242424',
    
    // Accents
    primary: '#E8FF47', // Lime elettrico
    primaryDim: '#C4D93D',
    secondary: '#FF6B6B', // Coral per Carmen
    tertiary: '#6BFFEB', // Aqua per statistiche
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    
    // States
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    
    // Manuel, Carmen & Ryan
    manuel: '#6B8AFF',
    carmen: '#FF8AC4',
    ryan: '#7ED957', // Verde per Ryan
  },
  
  fonts: {
    display: "'Space Grotesk', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  
  radius: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    full: '9999px',
  },
  
  shadows: {
    glow: '0 0 40px rgba(232, 255, 71, 0.15)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    elevated: '0 8px 40px rgba(0, 0, 0, 0.6)',
  }
};

// Dati iniziali
const initialData = {
  manuel: {
    name: 'Manuel',
    emoji: '🧍‍♂️',
    color: tokens.colors.manuel,
    startWeight: 90,
    targetWeight: 80,
    height: 180,
    weights: [
      { date: '2025-01-01', value: 90.0 },
      { date: '2025-01-02', value: 89.8 },
      { date: '2025-01-03', value: 89.5 },
      { date: '2025-01-04', value: 89.7 },
    ],
    streak: 4,
    streakProtectorAvailable: true,
    completedDays: 4,
    waterTarget: 8, // Bicchieri d'acqua obiettivo
    portions: {
      yogurt: '170g',
      eggs: '2 uova',
      bread: '60g',
      pasta: '80g',
      meat: '180-200g',
      potatoes: '200g',
    }
  },
  carmen: {
    name: 'Carmen',
    emoji: '🧍‍♀️',
    color: tokens.colors.carmen,
    startWeight: 64,
    targetWeight: 59,
    height: 170,
    weights: [
      { date: '2025-01-01', value: 64.0 },
      { date: '2025-01-02', value: 63.9 },
      { date: '2025-01-03', value: 63.7 },
      { date: '2025-01-04', value: 63.8 },
    ],
    streak: 4,
    streakProtectorAvailable: true,
    completedDays: 4,
    waterTarget: 8, // Bicchieri d'acqua obiettivo
    cycleStart: null,
    cyclePhase: null, // 'mestruale', 'follicolare', 'ovulazione', 'luteale'
    portions: {
      yogurt: '125g',
      eggs: '1-2 uova',
      bread: '40g',
      pasta: '60g',
      meat: '120-150g',
      potatoes: '150g',
    }
  },
  ryan: {
    name: 'Ryan',
    emoji: '👦',
    color: tokens.colors.ryan,
    startWeight: 43,
    targetWeight: 43, // Obiettivo: crescita sana, non perdita peso
    height: 153,
    weights: [
      { date: '2025-01-04', value: 43.0 },
    ],
    streak: 0,
    streakProtectorAvailable: true,
    completedDays: 0,
    goal: 'crescita_sana', // Obiettivo specifico per Ryan
    restrictions: null, // Nessuna restrizione
    waterTarget: 4, // Bicchieri d'acqua obiettivo
    portions: {
      yogurt: '125g',
      eggs: '1 uovo',
      bread: '40g',
      pasta: '60g',
      meat: '100-120g',
      potatoes: '150g',
    }
  },
  couple: {
    coupleStreak: 4,
    totalWeightLost: 1.3,
    daysCompletedTogether: 4,
  }
};

// Piano alimentare
const mealPlan = {
  colazione: {
    name: 'Colazione',
    icon: '🍳',
    time: '07:00 - 09:00',
    options: [
      {
        id: 'yogurt',
        name: 'Yogurt greco + frutto',
        items: ['Yogurt greco/proteico', '1 frutto (mela/pera/banana piccola)', 'Caffè'],
        portions: { manuel: '170g yogurt', carmen: '125g yogurt', ryan: '125g yogurt' }
      },
      {
        id: 'salata',
        name: 'Colazione salata',
        items: ['Uova strapazzate', 'Pane integrale/segale'],
        portions: { manuel: '2 uova + 60g pane', carmen: '1-2 uova + 40g pane', ryan: '1 uovo + 40g pane' }
      },
      {
        id: 'fuori',
        name: 'Fuori casa',
        items: ['Cornetto semplice', 'Cappuccino'],
        portions: { manuel: 'Standard', carmen: 'Standard', ryan: 'Standard' },
        note: 'No extra'
      }
    ]
  },
  spuntino1: {
    name: 'Spuntino Mattina',
    icon: '🍎',
    time: '10:30 - 11:00',
    options: [
      { id: 'yogurt_snack', name: 'Yogurt proteico', portions: { manuel: '1 vasetto', carmen: '1 vasetto', ryan: '1 vasetto' } },
      { id: 'frutta', name: 'Frutto', portions: { manuel: '1 frutto', carmen: '1 frutto', ryan: '1 frutto' } },
      { id: 'parmigiano', name: 'Parmigiano', portions: { manuel: '30g', carmen: '20g', ryan: '20g' } },
      { id: 'barretta', name: 'Barretta proteica', portions: { manuel: '1', carmen: '1', ryan: '1' } },
      { id: 'pavesini', name: 'Pavesini', portions: { manuel: '3', carmen: '2', ryan: '2' } },
    ]
  },
  pranzo: {
    name: 'Pranzo',
    icon: '🍝',
    time: '12:30 - 14:00',
    structure: ['Proteine', 'Carboidrati', 'Verdure', '1 cucchiaio olio EVO'],
    proteins: ['Pollo', 'Tacchino', 'Manzo', 'Pesce', 'Uova'],
    carbs: ['Pasta', 'Riso', 'Patate', 'Pane'],
    veggies: ['Spinaci', 'Insalata', 'Piselli', 'Fagiolini'],
    portions: {
      manuel: { pasta: '80g crudi', meat: '180-200g' },
      carmen: { pasta: '60g crudi', meat: '120-150g' },
      ryan: { pasta: '60g crudi', meat: '100-120g' }
    }
  },
  spuntino2: {
    name: 'Spuntino Pomeriggio',
    icon: '🥜',
    time: '16:00 - 17:00',
    options: [
      { id: 'yogurt_snack', name: 'Yogurt proteico', portions: { manuel: '1 vasetto', carmen: '1 vasetto', ryan: '1 vasetto' } },
      { id: 'frutta', name: 'Frutto', portions: { manuel: '1 frutto', carmen: '1 frutto', ryan: '1 frutto' } },
      { id: 'parmigiano', name: 'Parmigiano', portions: { manuel: '30g', carmen: '20g', ryan: '20g' } },
      { id: 'barretta', name: 'Barretta proteica', portions: { manuel: '1', carmen: '1', ryan: '1' } },
      { id: 'pavesini', name: 'Pavesini', portions: { manuel: '3', carmen: '2', ryan: '2' } },
    ]
  },
  cena: {
    name: 'Cena',
    icon: '🍽️',
    time: '19:30 - 21:00',
    options: [
      {
        id: 'casa',
        name: 'A casa',
        items: ['Proteine', 'Verdure libere', 'Pane o patate'],
        portions: { manuel: '60g pane o 200g patate', carmen: '40g pane o 150g patate', ryan: '40g pane o 150g patate' }
      },
      {
        id: 'pizzeria',
        name: 'Pizzeria',
        items: ['Pizza normale'],
        note: 'No antipasti',
        portions: { manuel: '1 pizza', carmen: '1 pizza', ryan: '1 pizza piccola' }
      },
      {
        id: 'trattoria',
        name: 'Trattoria',
        items: ['Secondo', 'Contorno'],
        portions: { manuel: 'Standard', carmen: 'Standard', ryan: 'Standard' }
      },
      {
        id: 'sushi',
        name: 'Sushi',
        items: ['Sushi/sashimi'],
        note: 'Senza abbuffata',
        portions: { manuel: 'Moderato', carmen: 'Moderato', ryan: 'Moderato' }
      },
    ]
  }
};

// Lista spesa base
const shoppingListTemplate = {
  proteine: [
    { name: 'Petto di pollo', qty: '800g', checked: false },
    { name: 'Petto di tacchino', qty: '500g', checked: false },
    { name: 'Manzo macinato magro', qty: '400g', checked: false },
    { name: 'Filetti di pesce', qty: '600g', checked: false },
    { name: 'Uova', qty: '12', checked: false },
  ],
  carboidrati: [
    { name: 'Pasta integrale', qty: '500g', checked: false },
    { name: 'Riso basmati', qty: '500g', checked: false },
    { name: 'Pane integrale/segale', qty: '400g', checked: false },
    { name: 'Patate', qty: '1kg', checked: false },
  ],
  verdure: [
    { name: 'Spinaci freschi', qty: '400g', checked: false },
    { name: 'Insalata mista', qty: '300g', checked: false },
    { name: 'Piselli surgelati', qty: '500g', checked: false },
    { name: 'Fagiolini', qty: '400g', checked: false },
  ],
  frutta: [
    { name: 'Mele', qty: '6', checked: false },
    { name: 'Pere', qty: '4', checked: false },
    { name: 'Banane piccole', qty: '6', checked: false },
  ],
  latticini: [
    { name: 'Yogurt greco', qty: '6 vasetti', checked: false },
    { name: 'Yogurt proteico', qty: '6 vasetti', checked: false },
    { name: 'Parmigiano', qty: '200g', checked: false },
  ],
  bevande: [
    { name: 'Acqua naturale', qty: '6L', checked: false },
    { name: 'Coca Zero', qty: '4 lattine', checked: false },
  ],
  condimenti: [
    { name: 'Olio EVO', qty: '500ml', checked: false },
    { name: 'Sale', qty: 'q.b.', checked: false },
    { name: 'Spezie varie', qty: 'q.b.', checked: false },
  ],
  snack: [
    { name: 'Barrette proteiche', qty: '6', checked: false },
    { name: 'Pavesini', qty: '1 confezione', checked: false },
  ],
};

// ============================================
// COMPONENTI UI
// ============================================

// Stili globali
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'DM Sans', sans-serif;
      background: ${tokens.colors.bg};
      color: ${tokens.colors.textPrimary};
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    
    ::-webkit-scrollbar {
      width: 6px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${tokens.colors.bgCard};
    }
    
    ::-webkit-scrollbar-thumb {
      background: ${tokens.colors.textMuted};
      border-radius: 3px;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(232, 255, 71, 0.2); }
      50% { box-shadow: 0 0 40px rgba(232, 255, 71, 0.4); }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes checkmark {
      0% { stroke-dashoffset: 50; }
      100% { stroke-dashoffset: 0; }
    }
    
    .animate-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
    
    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    .stagger-4 { animation-delay: 0.4s; }
    .stagger-5 { animation-delay: 0.5s; }
  `}</style>
);

// Container App
const AppContainer = ({ children }) => (
  <div style={{
    maxWidth: '430px',
    margin: '0 auto',
    minHeight: '100vh',
    background: tokens.colors.bg,
    position: 'relative',
    overflow: 'hidden',
  }}>
    {children}
  </div>
);

// Header
const Header = ({ title, subtitle, onBack, rightAction }) => (
  <header style={{
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: tokens.colors.bg,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: `1px solid ${tokens.colors.bgElevated}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.colors.textSecondary,
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ←
        </button>
      )}
      <div>
        <h1 style={{
          fontFamily: tokens.fonts.display,
          fontSize: '20px',
          fontWeight: 600,
          color: tokens.colors.textPrimary,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '13px',
            color: tokens.colors.textMuted,
            marginTop: '2px',
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {rightAction}
  </header>
);

// Card base
const Card = ({ children, onClick, style, glow }) => (
  <div
    onClick={onClick}
    style={{
      background: tokens.colors.bgCard,
      borderRadius: tokens.radius.lg,
      padding: '20px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      border: `1px solid ${tokens.colors.bgElevated}`,
      ...(glow && {
        boxShadow: tokens.shadows.glow,
        border: `1px solid ${tokens.colors.primary}33`,
      }),
      ...style,
    }}
  >
    {children}
  </div>
);

// Button primario
const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, fullWidth, icon, style }) => {
  const variants = {
    primary: {
      background: tokens.colors.primary,
      color: tokens.colors.bg,
      fontWeight: 600,
    },
    secondary: {
      background: tokens.colors.bgElevated,
      color: tokens.colors.textPrimary,
      border: `1px solid ${tokens.colors.textMuted}`,
    },
    ghost: {
      background: 'transparent',
      color: tokens.colors.textSecondary,
    },
    danger: {
      background: tokens.colors.error,
      color: tokens.colors.textPrimary,
    },
    success: {
      background: tokens.colors.success,
      color: tokens.colors.bg,
    },
  };
  
  const sizes = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '14px 24px', fontSize: '15px' },
    lg: { padding: '18px 32px', fontSize: '17px' },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: tokens.radius.md,
        border: variants[variant].border || 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: tokens.fonts.body,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

// Input numerico per peso
const WeightInput = ({ value, onChange, unit = 'kg' }) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: tokens.colors.bgElevated,
      borderRadius: tokens.radius.lg,
      padding: '16px 24px',
      border: `2px solid ${tokens.colors.primary}33`,
    }}>
      <input
        type="number"
        step="0.1"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(parseFloat(e.target.value));
        }}
        placeholder="00.0"
        style={{
          background: 'transparent',
          border: 'none',
          color: tokens.colors.textPrimary,
          fontSize: '48px',
          fontFamily: tokens.fonts.display,
          fontWeight: 700,
          width: '140px',
          textAlign: 'center',
          outline: 'none',
        }}
      />
      <span style={{
        fontSize: '24px',
        color: tokens.colors.textMuted,
        fontFamily: tokens.fonts.display,
      }}>
        {unit}
      </span>
    </div>
  );
};

// Progress ring
const ProgressRing = ({ progress, size = 120, strokeWidth = 8, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={tokens.colors.bgElevated}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color || tokens.colors.primary}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
};

// Badge streak
const StreakBadge = ({ count, hasProtector }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: `linear-gradient(135deg, ${tokens.colors.primary}22, ${tokens.colors.primary}11)`,
    borderRadius: tokens.radius.full,
    padding: '8px 16px',
    border: `1px solid ${tokens.colors.primary}44`,
  }}>
    <span style={{ fontSize: '20px' }}>🔥</span>
    <span style={{
      fontFamily: tokens.fonts.display,
      fontWeight: 700,
      fontSize: '18px',
      color: tokens.colors.primary,
    }}>
      {count}
    </span>
    {hasProtector && (
      <span style={{ fontSize: '14px' }} title="Streak Protector disponibile">🛡️</span>
    )}
  </div>
);

// Checkbox stilizzato
const Checkbox = ({ checked, onChange, label, sublabel }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      background: checked ? `${tokens.colors.success}11` : tokens.colors.bgElevated,
      borderRadius: tokens.radius.md,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: `1px solid ${checked ? tokens.colors.success + '44' : 'transparent'}`,
    }}
  >
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: tokens.radius.sm,
      border: `2px solid ${checked ? tokens.colors.success : tokens.colors.textMuted}`,
      background: checked ? tokens.colors.success : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    }}>
      {checked && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke={tokens.colors.bg}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 500,
        color: tokens.colors.textPrimary,
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{
          fontSize: '13px',
          color: tokens.colors.textMuted,
          marginTop: '2px',
        }}>
          {sublabel}
        </div>
      )}
    </div>
  </div>
);

// Toggle switch
const Toggle = ({ checked, onChange, label }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: tokens.colors.bgElevated,
      borderRadius: tokens.radius.md,
      cursor: 'pointer',
    }}
  >
    <span style={{ color: tokens.colors.textPrimary, fontSize: '15px' }}>{label}</span>
    <div style={{
      width: '52px',
      height: '28px',
      borderRadius: tokens.radius.full,
      background: checked ? tokens.colors.primary : tokens.colors.textMuted,
      padding: '2px',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: tokens.colors.textPrimary,
        transform: checked ? 'translateX(24px)' : 'translateX(0)',
        transition: 'all 0.2s ease',
      }} />
    </div>
  </div>
);

// Tab bar
const TabBar = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: '4px',
    background: tokens.colors.bgCard,
    borderRadius: tokens.radius.md,
    padding: '4px',
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1,
          padding: '12px 16px',
          background: activeTab === tab.id ? tokens.colors.bgElevated : 'transparent',
          border: 'none',
          borderRadius: tokens.radius.sm,
          color: activeTab === tab.id ? tokens.colors.textPrimary : tokens.colors.textMuted,
          fontFamily: tokens.fonts.body,
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {tab.icon && <span style={{ marginRight: '6px' }}>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);

// Meal option card
const MealOptionCard = ({ option, selected, onSelect, profile }) => (
  <div
    onClick={() => onSelect(option.id)}
    style={{
      padding: '16px',
      background: selected ? `${tokens.colors.primary}11` : tokens.colors.bgElevated,
      borderRadius: tokens.radius.md,
      cursor: 'pointer',
      border: `2px solid ${selected ? tokens.colors.primary : 'transparent'}`,
      transition: 'all 0.2s ease',
    }}
  >
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    }}>
      <span style={{
        fontSize: '15px',
        fontWeight: 600,
        color: tokens.colors.textPrimary,
      }}>
        {option.name}
      </span>
      {selected && (
        <span style={{
          background: tokens.colors.primary,
          color: tokens.colors.bg,
          padding: '2px 8px',
          borderRadius: tokens.radius.full,
          fontSize: '11px',
          fontWeight: 600,
        }}>
          ✓
        </span>
      )}
    </div>
    
    {option.items && (
      <div style={{
        fontSize: '13px',
        color: tokens.colors.textMuted,
        marginBottom: '8px',
      }}>
        {option.items.join(' • ')}
      </div>
    )}
    
    <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
    }}>
      <span style={{
        background: tokens.colors.bgCard,
        padding: '4px 10px',
        borderRadius: tokens.radius.sm,
        fontSize: '12px',
        color: tokens.colors.primary,
        fontFamily: tokens.fonts.mono,
      }}>
        {option.portions?.[profile] || 'Standard'}
      </span>
    </div>
    
    {option.note && (
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: tokens.colors.warning,
        fontStyle: 'italic',
      }}>
        ⚠️ {option.note}
      </div>
    )}
  </div>
);

// Stat card mini
const StatMini = ({ label, value, icon, color }) => (
  <div style={{
    background: tokens.colors.bgElevated,
    borderRadius: tokens.radius.md,
    padding: '16px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{
      fontSize: '24px',
      fontWeight: 700,
      fontFamily: tokens.fonts.display,
      color: color || tokens.colors.textPrimary,
    }}>
      {value}
    </div>
    <div style={{
      fontSize: '12px',
      color: tokens.colors.textMuted,
      marginTop: '4px',
    }}>
      {label}
    </div>
  </div>
);

// ============================================
// SCHERMATE PRINCIPALI
// ============================================

// 1. LOGIN SCREEN
const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = () => {
    if (password === 'Manzallone26') {
      setError('');
      onLogin();
    } else {
      setError('Password errata');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '32px 24px',
      background: `linear-gradient(180deg, ${tokens.colors.bg} 0%, ${tokens.colors.bgCard} 100%)`,
    }}>
      <div className="animate-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '16px',
        }}>
          🦁
        </div>
        <h1 style={{
          fontFamily: tokens.fonts.display,
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '8px',
          background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.tertiary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ManzAllone
        </h1>
        <p style={{
          color: tokens.colors.textMuted,
          fontSize: '15px',
        }}>
          Manuel + Carmen + Ryan 💪
        </p>
      </div>
      
      <div className="animate-in stagger-1" style={{ marginBottom: '24px' }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: tokens.colors.bgElevated,
            border: `1px solid ${error ? tokens.colors.error : tokens.colors.textMuted + '33'}`,
            borderRadius: tokens.radius.md,
            color: tokens.colors.textPrimary,
            fontSize: '16px',
            fontFamily: tokens.fonts.body,
            outline: 'none',
          }}
        />
        {error && (
          <p style={{
            color: tokens.colors.error,
            fontSize: '13px',
            marginTop: '8px',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}
      </div>
      
      <div className="animate-in stagger-2">
        <Button
          onClick={handleLogin}
          fullWidth
          size="lg"
        >
          Accedi
        </Button>
      </div>
    </div>
  );
};

// 2. PROFILE SELECTION (Post-login)
const ProfileSelection = ({ onSelectProfile, data }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 24px',
    background: tokens.colors.bg,
  }}>
    <div className="animate-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
      <h1 style={{
        fontFamily: tokens.fonts.display,
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '8px',
      }}>
        Chi sei oggi? 👋
      </h1>
      <p style={{
        color: tokens.colors.textMuted,
        fontSize: '15px',
      }}>
        Seleziona il tuo profilo
      </p>
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
      {/* Manuel */}
      <Card
        onClick={() => onSelectProfile('manuel')}
        className="animate-in stagger-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          border: `2px solid ${data.manuel.color}44`,
          background: `linear-gradient(135deg, ${tokens.colors.bgCard}, ${data.manuel.color}11)`,
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `${data.manuel.color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          🧍‍♂️
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: tokens.fonts.display,
            fontSize: '22px',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            Manuel
          </h2>
          <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
            {data.manuel.weights[data.manuel.weights.length - 1]?.value} kg • Streak: {data.manuel.streak} 🔥
          </p>
        </div>
        <span style={{ fontSize: '24px', color: tokens.colors.textMuted }}>→</span>
      </Card>
      
      {/* Carmen */}
      <Card
        onClick={() => onSelectProfile('carmen')}
        className="animate-in stagger-2"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          border: `2px solid ${data.carmen.color}44`,
          background: `linear-gradient(135deg, ${tokens.colors.bgCard}, ${data.carmen.color}11)`,
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `${data.carmen.color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          🧍‍♀️
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: tokens.fonts.display,
            fontSize: '22px',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            Carmen
          </h2>
          <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
            {data.carmen.weights[data.carmen.weights.length - 1]?.value} kg • Streak: {data.carmen.streak} 🔥
          </p>
        </div>
        <span style={{ fontSize: '24px', color: tokens.colors.textMuted }}>→</span>
      </Card>

      {/* Ryan */}
      <Card
        onClick={() => onSelectProfile('ryan')}
        className="animate-in stagger-3"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          border: `2px solid ${data.ryan.color}44`,
          background: `linear-gradient(135deg, ${tokens.colors.bgCard}, ${data.ryan.color}11)`,
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `${data.ryan.color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          👦
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: tokens.fonts.display,
            fontSize: '22px',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            Ryan
          </h2>
          <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
            {data.ryan.weights[data.ryan.weights.length - 1]?.value} kg • Streak: {data.ryan.streak} 🔥
          </p>
        </div>
        <span style={{ fontSize: '24px', color: tokens.colors.textMuted }}>→</span>
      </Card>

      {/* Statistiche */}
      <Card
        onClick={() => onSelectProfile('stats')}
        className="animate-in stagger-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          border: `2px solid ${tokens.colors.tertiary}44`,
          background: `linear-gradient(135deg, ${tokens.colors.bgCard}, ${tokens.colors.tertiary}11)`,
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `${tokens.colors.tertiary}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          📊
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: tokens.fonts.display,
            fontSize: '22px',
            fontWeight: 600,
            marginBottom: '4px',
          }}>
            Statistiche
          </h2>
          <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
            Streak coppia: {data.couple.coupleStreak} 🔥 • -{data.couple.totalWeightLost} kg insieme
          </p>
        </div>
        <span style={{ fontSize: '24px', color: tokens.colors.textMuted }}>→</span>
      </Card>
    </div>
  </div>
);

// 3. HOME / DAILY FLOW
const DailyHome = ({ profile, data, onNavigate, onCloseDay, tasks, setTasks, mealsProgress = 0, weeklyMovement, onMovementToggle, onHardDay, waterCount = 0, waterTarget = 8, onWaterChange }) => {
  const profileData = data[profile];
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const currentWeight = profileData.weights[profileData.weights.length - 1]?.value;
  const weightLost = profileData.startWeight - currentWeight;
  const progressPercent = Math.round((weightLost / (profileData.startWeight - profileData.targetWeight)) * 100);
  
  const allTasksComplete = tasks.weight && tasks.meals; // Movimento non blocca più
  
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bg,
      paddingBottom: '100px',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        background: `linear-gradient(180deg, ${profileData.color}11 0%, transparent 100%)`,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}>
          <div>
            <p style={{
              color: tokens.colors.textMuted,
              fontSize: '13px',
              textTransform: 'capitalize',
              marginBottom: '4px',
            }}>
              {today}
            </p>
            <h1 style={{
              fontFamily: tokens.fonts.display,
              fontSize: '28px',
              fontWeight: 700,
            }}>
              Ciao {profileData.name} {profileData.emoji}
            </h1>
          </div>
          <StreakBadge count={profileData.streak} hasProtector={profileData.streakProtectorAvailable} />
        </div>
        
        {/* Progress card */}
        <Card glow style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}>
            <div style={{ position: 'relative' }}>
              <ProgressRing progress={Math.min(progressPercent, 100)} color={profileData.color} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  fontFamily: tokens.fonts.display,
                  color: profileData.color,
                }}>
                  {progressPercent}%
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: tokens.colors.textMuted, fontSize: '13px' }}>Peso attuale</span>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  fontFamily: tokens.fonts.display,
                }}>
                  {currentWeight} <span style={{ fontSize: '18px', color: tokens.colors.textMuted }}>kg</span>
                </div>
              </div>
              <div style={{
                display: 'flex',
                gap: '16px',
              }}>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: '11px' }}>Persi</span>
                  <div style={{ color: tokens.colors.success, fontWeight: 600, fontSize: '15px' }}>
                    -{weightLost.toFixed(1)} kg
                  </div>
                </div>
                <div>
                  <span style={{ color: tokens.colors.textMuted, fontSize: '11px' }}>Obiettivo</span>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>
                    {profileData.targetWeight} kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Daily tasks */}
      <div style={{ padding: '0 24px' }}>
        <h2 style={{
          fontFamily: tokens.fonts.display,
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>📋</span> Oggi devi fare
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <div
            onClick={() => !tasks.weight && onNavigate('weight')}
            style={{ cursor: tasks.weight ? 'default' : 'pointer' }}
          >
            <Checkbox
              checked={tasks.weight}
              onChange={() => {}}
              label="Registra il peso"
              sublabel={tasks.weight ? `✓ ${profileData.weights[profileData.weights.length - 1]?.value} kg registrato` : "Tocca per pesarti"}
            />
          </div>

          {/* Water Counter - inline */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: waterCount >= waterTarget ? `${tokens.colors.success}11` : tokens.colors.bgElevated,
            borderRadius: tokens.radius.md,
            border: `1px solid ${waterCount >= waterTarget ? tokens.colors.success + '44' : 'transparent'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💧</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: tokens.colors.textPrimary }}>
                  {waterCount >= waterTarget ? '✓ Obiettivo acqua raggiunto!' : 'Acqua'}
                </div>
                <div style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
                  {waterCount}/{waterTarget} bicchieri
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onWaterChange && onWaterChange(Math.max(0, waterCount - 1)); }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: `1px solid ${tokens.colors.textMuted}`,
                  background: 'transparent',
                  color: tokens.colors.textPrimary,
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                −
              </button>
              <span style={{
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: tokens.fonts.display,
                color: waterCount >= waterTarget ? tokens.colors.success : tokens.colors.tertiary,
                minWidth: '30px',
                textAlign: 'center',
              }}>
                {waterCount}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onWaterChange && onWaterChange(waterCount + 1); }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: tokens.colors.tertiary,
                  color: tokens.colors.bg,
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          </div>

          <div
            onClick={() => onNavigate('meals')}
            style={{ cursor: 'pointer' }}
          >
            <Checkbox
              checked={tasks.meals}
              onChange={() => {}}
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Traccia i pasti
                  {!tasks.meals && (
                    <span style={{
                      background: mealsProgress > 0 ? `${tokens.colors.primary}` : tokens.colors.bgCard,
                      color: mealsProgress > 0 ? tokens.colors.bg : tokens.colors.textMuted,
                      padding: '4px 10px',
                      borderRadius: tokens.radius.full,
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: tokens.fonts.mono,
                    }}>
                      {mealsProgress}/5
                    </span>
                  )}
                </span>
              }
              sublabel={tasks.hardDay ? "😮‍💨 Giornata difficile" : (tasks.meals ? "✓ Tutti i pasti registrati" : "Tocca per registrare")}
            />
          </div>
        </div>
        
        {/* Movimento settimanale */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontFamily: tokens.fonts.display,
              fontSize: '18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>🏃</span> Movimento settimanale
            </h2>
            <span style={{
              background: weeklyMovement.done >= weeklyMovement.target 
                ? `${tokens.colors.success}22` 
                : `${tokens.colors.primary}22`,
              color: weeklyMovement.done >= weeklyMovement.target 
                ? tokens.colors.success 
                : tokens.colors.primary,
              padding: '6px 12px',
              borderRadius: tokens.radius.full,
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: tokens.fonts.mono,
            }}>
              {weeklyMovement.done}/{weeklyMovement.target}
            </span>
          </div>
          
          {/* Progress bar settimanale */}
          <div style={{
            height: '8px',
            background: tokens.colors.bgElevated,
            borderRadius: tokens.radius.full,
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min((weeklyMovement.done / weeklyMovement.target) * 100, 100)}%`,
              background: weeklyMovement.done >= weeklyMovement.target 
                ? tokens.colors.success 
                : tokens.colors.primary,
              borderRadius: tokens.radius.full,
              transition: 'all 0.3s ease',
            }} />
          </div>
          
          {/* Toggle oggi */}
          <div
            onClick={() => onMovementToggle(!weeklyMovement.todayDone)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: weeklyMovement.todayDone 
                ? `${tokens.colors.success}11` 
                : tokens.colors.bgElevated,
              borderRadius: tokens.radius.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: `1px solid ${weeklyMovement.todayDone ? tokens.colors.success + '44' : 'transparent'}`,
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: tokens.radius.sm,
              border: `2px solid ${weeklyMovement.todayDone ? tokens.colors.success : tokens.colors.textMuted}`,
              background: weeklyMovement.todayDone ? tokens.colors.success : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}>
              {weeklyMovement.todayDone && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke={tokens.colors.bg}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '15px',
                fontWeight: 500,
                color: tokens.colors.textPrimary,
              }}>
                {weeklyMovement.todayDone ? "✓ Fatto oggi!" : "Ho fatto movimento oggi"}
              </div>
              <div style={{
                fontSize: '13px',
                color: tokens.colors.textMuted,
                marginTop: '2px',
              }}>
                20-30 min camminata, scale, allenamento...
              </div>
            </div>
          </div>
          
          {weeklyMovement.done >= weeklyMovement.target && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: `${tokens.colors.success}11`,
              borderRadius: tokens.radius.md,
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '16px' }}>🎉</span>
              <span style={{
                marginLeft: '8px',
                color: tokens.colors.success,
                fontWeight: 600,
                fontSize: '14px',
              }}>
                Obiettivo settimanale raggiunto!
              </span>
            </div>
          )}
        </div>

        {/* Carmen cycle tracking */}
        {profile === 'carmen' && (
          <Card style={{ marginBottom: '24px', background: `${tokens.colors.carmen}11` }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                  🌸 Ciclo mestruale
                </h3>
                <p style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
                  {data.carmen.cyclePhase ? `Fase: ${data.carmen.cyclePhase}` : 'Non tracciato'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('cycle')}
              >
                Aggiorna
              </Button>
            </div>
          </Card>
        )}
        
        {/* Quick actions */}
        <h2 style={{
          fontFamily: tokens.fonts.display,
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚡</span> Azioni rapide
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <Card onClick={() => onNavigate('shopping')} style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🛒</div>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>Lista spesa</div>
          </Card>
          <Card onClick={() => onNavigate('stats')} style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>Statistiche</div>
          </Card>
          <Card onClick={() => onNavigate('profileSelect')} style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏠</div>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>Main Menu</div>
          </Card>
        </div>
        
        {/* Hard day mode */}
        <Card 
          onClick={onHardDay}
          style={{
            background: tokens.colors.bgElevated,
            marginBottom: '24px',
            border: `1px dashed ${tokens.colors.textMuted}44`,
            cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <span style={{ fontSize: '32px' }}>😮‍💨</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                Giornata difficile?
              </h3>
              <p style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
                Registra solo il peso e chiudi. Nessun giudizio.
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Close day button - Fixed bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        padding: '16px 24px 32px',
        background: `linear-gradient(transparent, ${tokens.colors.bg} 30%)`,
      }}>
        <Button
          onClick={onCloseDay}
          fullWidth
          size="lg"
          disabled={!allTasksComplete}
          style={{
            background: allTasksComplete ? tokens.colors.primary : tokens.colors.bgElevated,
            color: allTasksComplete ? tokens.colors.bg : tokens.colors.textMuted,
            animation: allTasksComplete ? 'glow 2s ease-in-out infinite' : 'none',
          }}
        >
          🔒 Chiudi Giornata
        </Button>
        {!allTasksComplete && (
          <p style={{
            textAlign: 'center',
            color: tokens.colors.textMuted,
            fontSize: '12px',
            marginTop: '8px',
          }}>
            Completa tutte le attività per chiudere
          </p>
        )}
      </div>
    </div>
  );
};

// 4. MEALS TRACKING
const MealsScreen = ({ profile, data, onBack, onSave, onProgress, onStatusChange, onSelectionChange, savedStatuses, savedSelections }) => {
  // Usa i dati salvati se esistono
  const [selectedMeals, setSelectedMeals] = useState(savedSelections || {
    colazione: null,
    spuntino1: null,
    pranzo: null,
    spuntino2: null,
    cena: null,
  });

  const [mealStatuses, setMealStatuses] = useState(savedStatuses || {
    colazione: null,
    spuntino1: null,
    pranzo: null,
    spuntino2: null,
    cena: null,
  });

  // FIX: Aggiorna lo stato quando i dati salvati cambiano (caricati da Supabase)
  useEffect(() => {
    if (savedStatuses) {
      setMealStatuses(savedStatuses);
    }
  }, [savedStatuses]);

  useEffect(() => {
    if (savedSelections) {
      setSelectedMeals(savedSelections);
    }
  }, [savedSelections]);

  // Quale pasto è espanso (accordion)
  const [expandedMeal, setExpandedMeal] = useState(null);
  
  const meals = Object.entries(mealPlan);
  
  // Conta quanti pasti sono stati registrati
  const completedMeals = Object.values(mealStatuses).filter(status => status !== null).length;
  const totalMeals = 5;
  const allMealsCompleted = completedMeals === totalMeals;
  
  // Notifica il progresso e salva lo stato quando cambia
  useEffect(() => {
    if (onProgress) {
      onProgress(completedMeals);
    }
    if (onStatusChange) {
      onStatusChange(mealStatuses);
    }
    if (onSelectionChange) {
      onSelectionChange(selectedMeals);
    }
    // Se tutti completati, segna come fatto
    if (allMealsCompleted && onSave) {
      onSave();
    }
  }, [completedMeals, allMealsCompleted, mealStatuses, selectedMeals]);
  
  // Salva automaticamente quando si torna indietro
  const handleBack = () => {
    if (onProgress) {
      onProgress(completedMeals);
    }
    if (onStatusChange) {
      onStatusChange(mealStatuses);
    }
    if (onSelectionChange) {
      onSelectionChange(selectedMeals);
    }
    onBack();
  };
  
  // Toggle accordion
  const toggleMeal = (key) => {
    setExpandedMeal(expandedMeal === key ? null : key);
  };
  
  // Trova il nome dell'opzione selezionata
  const getSelectedOptionName = (key, meal) => {
    if (!selectedMeals[key] || !meal.options) return null;
    const option = meal.options.find(o => o.id === selectedMeals[key]);
    return option?.name || null;
  };
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg, paddingBottom: '40px' }}>
      <Header
        title="Piano Pasti"
        subtitle={allMealsCompleted ? "✓ Completato!" : `${completedMeals}/${totalMeals} registrati`}
        onBack={handleBack}
      />
      
      {/* Progress bar */}
      <div style={{ padding: '0 24px', marginBottom: '16px' }}>
        <div style={{
          height: '6px',
          background: tokens.colors.bgElevated,
          borderRadius: tokens.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(completedMeals / totalMeals) * 100}%`,
            background: allMealsCompleted ? tokens.colors.success : tokens.colors.primary,
            borderRadius: tokens.radius.full,
            transition: 'all 0.3s ease',
          }} />
        </div>
        {/* Auto-save indicator */}
        <p style={{
          fontSize: '12px',
          color: tokens.colors.textMuted,
          textAlign: 'center',
          marginTop: '8px',
        }}>
          💾 Salvataggio automatico
        </p>
      </div>
      
      <div style={{ padding: '16px 24px' }}>
        {/* Porzioni info */}
        <Card style={{ marginBottom: '24px', background: `${data[profile].color}11` }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '24px' }}>{data[profile].emoji}</span>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Le tue porzioni</h3>
              <p style={{ fontSize: '12px', color: tokens.colors.textMuted }}>
                {profile === 'manuel' ? '1 porzione standard' : '¾ porzione'}
              </p>
            </div>
          </div>
        </Card>
        
        {/* Meals list - Accordion style */}
        {meals.map(([key, meal], index) => {
          const isExpanded = expandedMeal === key;
          const status = mealStatuses[key];
          const selectedOption = getSelectedOptionName(key, meal);
          
          return (
            <div
              key={key}
              className="animate-in"
              style={{ 
                animationDelay: `${index * 0.05}s`, 
                marginBottom: '12px',
                background: tokens.colors.bgCard,
                borderRadius: tokens.radius.lg,
                overflow: 'hidden',
                border: status ? `1px solid ${
                  status === 'followed' ? tokens.colors.success + '44' :
                  status === 'different' ? tokens.colors.warning + '44' :
                  tokens.colors.error + '44'
                }` : `1px solid ${tokens.colors.bgElevated}`,
              }}
            >
              {/* Meal header - always visible */}
              <div
                onClick={() => toggleMeal(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  cursor: 'pointer',
                  background: status ? (
                    status === 'followed' ? tokens.colors.success + '11' :
                    status === 'different' ? tokens.colors.warning + '11' :
                    tokens.colors.error + '11'
                  ) : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '24px' }}>{meal.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{meal.name}</h3>
                      {status && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: tokens.radius.full,
                          fontSize: '11px',
                          fontWeight: 600,
                          background: status === 'followed' ? tokens.colors.success :
                                     status === 'different' ? tokens.colors.warning :
                                     tokens.colors.error,
                          color: status === 'followed' || status === 'skipped' ? tokens.colors.bg : tokens.colors.bg,
                        }}>
                          {status === 'followed' ? '✓' : status === 'different' ? '⚠️' : '✗'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: tokens.colors.textMuted }}>
                      {status && selectedOption ? selectedOption : meal.time}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '20px',
                  color: tokens.colors.textMuted,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}>
                  ▼
                </span>
              </div>
              
              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  padding: '0 16px 16px',
                  borderTop: `1px solid ${tokens.colors.bgElevated}`,
                }}>
                  {/* Quick status buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    marginBottom: '16px',
                  }}>
                    <button
                      onClick={() => setMealStatuses({ ...mealStatuses, [key]: 'followed' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: status === 'followed' ? tokens.colors.success : tokens.colors.bgElevated,
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        color: status === 'followed' ? tokens.colors.bg : tokens.colors.textMuted,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✓ Seguito
                    </button>
                    <button
                      onClick={() => setMealStatuses({ ...mealStatuses, [key]: 'different' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: status === 'different' ? tokens.colors.warning : tokens.colors.bgElevated,
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        color: status === 'different' ? tokens.colors.bg : tokens.colors.textMuted,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ⚠️ Diverso
                    </button>
                    <button
                      onClick={() => setMealStatuses({ ...mealStatuses, [key]: 'skipped' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: status === 'skipped' ? tokens.colors.error : tokens.colors.bgElevated,
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        color: status === 'skipped' ? tokens.colors.bg : tokens.colors.textMuted,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✗ Saltato
                    </button>
                  </div>
                  
                  {/* Meal options (Level 2) - only show if followed */}
                  {meal.options && status === 'followed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '13px', color: tokens.colors.textMuted, marginBottom: '4px' }}>
                        Cosa hai mangiato?
                      </p>
                      {meal.options.map(option => (
                        <MealOptionCard
                          key={option.id}
                          option={option}
                          selected={selectedMeals[key] === option.id}
                          onSelect={(id) => setSelectedMeals({ ...selectedMeals, [key]: id })}
                          profile={profile}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* For pranzo - show structure */}
                  {key === 'pranzo' && status === 'followed' && !meal.options && (
                    <Card style={{ background: tokens.colors.bgElevated, marginTop: '8px' }}>
                      <p style={{ fontSize: '13px', color: tokens.colors.textMuted, marginBottom: '12px' }}>
                        Struttura: {meal.structure.join(' + ')}
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}>
                        <div>
                          <span style={{ fontSize: '11px', color: tokens.colors.textMuted }}>Carboidrati</span>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.primary }}>
                            {meal.portions[profile].pasta}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: tokens.colors.textMuted }}>Proteine</span>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: tokens.colors.primary }}>
                            {meal.portions[profile].meat}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Beverages reminder */}
        <Card style={{ marginTop: '16px', marginBottom: '24px', background: tokens.colors.bgElevated }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            🥤 Bevande
          </h3>
          <div style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
            <p>• Acqua: bevi regolarmente</p>
            <p>• Coca Zero: max {profile === 'manuel' ? '2-3' : '1-2'}/settimana</p>
            <p>• Alcol: 1-2 volte/settimana</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// 5. SHOPPING LIST
const ShoppingList = ({ onBack }) => {
  // Funzione per creare una copia fresca della lista
  const getInitialList = () => {
    const freshList = {};
    Object.entries(shoppingListTemplate).forEach(([category, items]) => {
      freshList[category] = items.map(item => ({ ...item, checked: false }));
    });
    return freshList;
  };
  
  const [list, setList] = useState(getInitialList);
  
  const toggleItem = (category, index) => {
    const newList = { ...list };
    newList[category] = [...newList[category]];
    newList[category][index] = { ...newList[category][index], checked: !newList[category][index].checked };
    setList(newList);
  };
  
  const resetList = () => {
    setList(getInitialList());
  };
  
  const categories = Object.entries(list);
  const totalItems = categories.reduce((acc, [, items]) => acc + items.length, 0);
  const checkedItems = categories.reduce((acc, [, items]) => acc + items.filter(i => i.checked).length, 0);
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg }}>
      <Header
        title="Lista Spesa"
        subtitle={`${checkedItems}/${totalItems} completati`}
        onBack={onBack}
        rightAction={
          <Button variant="ghost" size="sm" onClick={resetList}>
            🔄 Reset
          </Button>
        }
      />
      
      <div style={{ padding: '16px 24px' }}>
        {/* Progress bar */}
        <div style={{
          height: '4px',
          background: tokens.colors.bgElevated,
          borderRadius: tokens.radius.full,
          marginBottom: '24px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(checkedItems / totalItems) * 100}%`,
            background: tokens.colors.primary,
            borderRadius: tokens.radius.full,
            transition: 'width 0.3s ease',
          }} />
        </div>
        
        {categories.map(([category, items], catIndex) => (
          <div
            key={category}
            className="animate-in"
            style={{ animationDelay: `${catIndex * 0.05}s`, marginBottom: '24px' }}
          >
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: tokens.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}>
              {category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => toggleItem(category, index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: item.checked ? tokens.colors.success + '11' : tokens.colors.bgCard,
                    borderRadius: tokens.radius.md,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: tokens.radius.sm,
                    border: `2px solid ${item.checked ? tokens.colors.success : tokens.colors.textMuted}`,
                    background: item.checked ? tokens.colors.success : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke={tokens.colors.bg} strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    flex: 1,
                    fontSize: '15px',
                    color: item.checked ? tokens.colors.textMuted : tokens.colors.textPrimary,
                    textDecoration: item.checked ? 'line-through' : 'none',
                  }}>
                    {item.name}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: tokens.colors.textMuted,
                    fontFamily: tokens.fonts.mono,
                  }}>
                    {item.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Weight Chart Component
const WeightChart = ({ data, showBoth = false, color, height = 200 }) => {
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const width = 350;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Prepara i dati
  const manuelWeights = data.manuel.weights;
  const carmenWeights = data.carmen.weights;
  
  // Trova min/max per scala Y
  const allWeights = showBoth 
    ? [...manuelWeights.map(w => w.value), ...carmenWeights.map(w => w.value)]
    : (color === data.manuel.color ? manuelWeights : carmenWeights).map(w => w.value);
  
  const minWeight = Math.floor(Math.min(...allWeights) - 1);
  const maxWeight = Math.ceil(Math.max(...allWeights) + 1);
  const weightRange = maxWeight - minWeight;
  
  // Funzioni di scala
  const scaleY = (value) => {
    return chartHeight - ((value - minWeight) / weightRange) * chartHeight;
  };
  
  const scaleX = (index, total) => {
    return (index / (total - 1)) * chartWidth;
  };
  
  // Genera path per una linea curva (bezier)
  const generatePath = (weights, personColor) => {
    if (weights.length < 2) return null;
    
    const points = weights.map((w, i) => ({
      x: padding.left + scaleX(i, weights.length),
      y: padding.top + scaleY(w.value),
    }));
    
    // Crea curva smooth con bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    
    return { path, points, color: personColor };
  };
  
  // Genera area fill gradient
  const generateArea = (weights) => {
    if (weights.length < 2) return null;
    
    const points = weights.map((w, i) => ({
      x: padding.left + scaleX(i, weights.length),
      y: padding.top + scaleY(w.value),
    }));
    
    let path = `M ${points[0].x} ${padding.top + chartHeight}`;
    path += ` L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    
    path += ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
    
    return path;
  };
  
  const manuelPath = showBoth || color === data.manuel.color 
    ? generatePath(manuelWeights, data.manuel.color) 
    : null;
  const carmenPath = showBoth || color === data.carmen.color 
    ? generatePath(carmenWeights, data.carmen.color) 
    : null;
  
  // Grid lines Y
  const yLines = [];
  const yStep = weightRange > 5 ? 2 : 1;
  for (let w = minWeight; w <= maxWeight; w += yStep) {
    yLines.push(w);
  }
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="manuelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={data.manuel.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={data.manuel.color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="carmenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={data.carmen.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={data.carmen.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {yLines.map((w, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={padding.top + scaleY(w)}
            x2={padding.left + chartWidth}
            y2={padding.top + scaleY(w)}
            stroke={tokens.colors.bgElevated}
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={padding.top + scaleY(w) + 4}
            fill={tokens.colors.textMuted}
            fontSize="11"
            textAnchor="end"
            fontFamily={tokens.fonts.mono}
          >
            {w}
          </text>
        </g>
      ))}
      
      {/* Area fills */}
      {manuelPath && (showBoth || color === data.manuel.color) && (
        <path
          d={generateArea(manuelWeights)}
          fill="url(#manuelGradient)"
        />
      )}
      {carmenPath && (showBoth || color === data.carmen.color) && (
        <path
          d={generateArea(carmenWeights)}
          fill="url(#carmenGradient)"
        />
      )}
      
      {/* Lines */}
      {manuelPath && (
        <path
          d={manuelPath.path}
          fill="none"
          stroke={manuelPath.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {carmenPath && (
        <path
          d={carmenPath.path}
          fill="none"
          stroke={carmenPath.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* Data points */}
      {manuelPath && manuelPath.points.map((p, i) => (
        <g key={`manuel-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r="6"
            fill={tokens.colors.bg}
            stroke={manuelPath.color}
            strokeWidth="3"
          />
          {i === manuelPath.points.length - 1 && (
            <text
              x={p.x}
              y={p.y - 12}
              fill={manuelPath.color}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              fontFamily={tokens.fonts.mono}
            >
              {manuelWeights[i].value}
            </text>
          )}
        </g>
      ))}
      {carmenPath && carmenPath.points.map((p, i) => (
        <g key={`carmen-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r="6"
            fill={tokens.colors.bg}
            stroke={carmenPath.color}
            strokeWidth="3"
          />
          {i === carmenPath.points.length - 1 && (
            <text
              x={p.x}
              y={p.y - 12}
              fill={carmenPath.color}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              fontFamily={tokens.fonts.mono}
            >
              {carmenWeights[i].value}
            </text>
          )}
        </g>
      ))}
      
      {/* X axis labels (days) */}
      {manuelWeights.map((w, i) => (
        <text
          key={i}
          x={padding.left + scaleX(i, manuelWeights.length)}
          y={height - 8}
          fill={tokens.colors.textMuted}
          fontSize="10"
          textAnchor="middle"
          fontFamily={tokens.fonts.mono}
        >
          {new Date(w.date).getDate()}/{new Date(w.date).getMonth() + 1}
        </text>
      ))}
    </svg>
  );
};

// 6. STATISTICS
const StatsScreen = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState('couple');
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg }}>
      <Header
        title="Statistiche"
        subtitle="Il vostro percorso insieme"
        onBack={onBack}
      />
      
      <div style={{ padding: '16px 24px' }}>
        <TabBar
          tabs={[
            { id: 'couple', label: 'Coppia', icon: '💑' },
            { id: 'manuel', label: 'Manuel', icon: '🧍‍♂️' },
            { id: 'carmen', label: 'Carmen', icon: '🧍‍♀️' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        
        {/* Couple stats */}
        {activeTab === 'couple' && (
          <div className="animate-in" style={{ marginTop: '24px' }}>
            {/* Couple streak highlight */}
            <Card glow style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔥</div>
              <div style={{
                fontSize: '56px',
                fontWeight: 700,
                fontFamily: tokens.fonts.display,
                background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.tertiary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {data.couple.coupleStreak}
              </div>
              <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
                Giorni consecutivi insieme
              </p>
            </Card>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <StatMini
                label="Kg persi insieme"
                value={`-${data.couple.totalWeightLost}`}
                icon="📉"
                color={tokens.colors.success}
              />
              <StatMini
                label="Giorni completati"
                value={data.couple.daysCompletedTogether}
                icon="✅"
                color={tokens.colors.tertiary}
              />
            </div>
            
            {/* Weight comparison chart */}
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
                📊 Andamento peso
              </h3>
              <div style={{
                background: tokens.colors.bgElevated,
                borderRadius: tokens.radius.md,
                padding: '16px 8px',
              }}>
                <WeightChart data={data} showBoth={true} height={220} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: data.manuel.color }} />
                  <span style={{ fontSize: '13px', color: tokens.colors.textMuted }}>Manuel</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: data.carmen.color }} />
                  <span style={{ fontSize: '13px', color: tokens.colors.textMuted }}>Carmen</span>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* Individual stats */}
        {(activeTab === 'manuel' || activeTab === 'carmen') && (
          <div className="animate-in" style={{ marginTop: '24px' }}>
            <Card style={{
              background: `linear-gradient(135deg, ${data[activeTab].color}11, ${tokens.colors.bgCard})`,
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: `${data[activeTab].color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}>
                  {data[activeTab].emoji}
                </div>
                <div>
                  <h2 style={{
                    fontFamily: tokens.fonts.display,
                    fontSize: '24px',
                    fontWeight: 600,
                  }}>
                    {data[activeTab].name}
                  </h2>
                  <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
                    {data[activeTab].height} cm
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Inizio</span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{data[activeTab].startWeight} kg</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Attuale</span>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: data[activeTab].color }}>
                    {data[activeTab].weights[data[activeTab].weights.length - 1]?.value} kg
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Obiettivo</span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{data[activeTab].targetWeight} kg</div>
                </div>
              </div>
            </Card>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <StatMini
                label="Streak personale"
                value={data[activeTab].streak}
                icon="🔥"
                color={tokens.colors.primary}
              />
              <StatMini
                label="Giorni completati"
                value={data[activeTab].completedDays}
                icon="✅"
                color={tokens.colors.success}
              />
            </div>
            
            {/* Individual weight chart */}
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
                📊 Il tuo andamento
              </h3>
              <div style={{
                background: tokens.colors.bgElevated,
                borderRadius: tokens.radius.md,
                padding: '16px 8px',
              }}>
                <WeightChart data={data} showBoth={false} color={data[activeTab].color} height={200} />
              </div>
            </Card>
            
            {/* Streak protector */}
            {data[activeTab].streakProtectorAvailable && (
              <Card style={{
                background: tokens.colors.bgElevated,
                border: `1px dashed ${tokens.colors.primary}44`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>🛡️</span>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Streak Protector disponibile</h3>
                    <p style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
                      1 giorno di grazia ogni 14 giorni
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 7. WEIGHT INPUT SCREEN
const WeightScreen = ({ profile, data, onBack, onSave }) => {
  const profileData = data[profile];
  const lastWeight = profileData.weights[profileData.weights.length - 1]?.value;
  const [weight, setWeight] = useState(lastWeight || '');
  
  const handleSave = () => {
    if (weight) {
      onSave(parseFloat(weight));
    }
  };
  
  const weightDiff = weight ? (parseFloat(weight) - profileData.startWeight).toFixed(1) : null;
  const isLoss = weightDiff && parseFloat(weightDiff) < 0;
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg }}>
      <Header
        title="Registra Peso"
        subtitle={new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        onBack={onBack}
      />
      
      <div style={{ padding: '24px', textAlign: 'center' }}>
        {/* Last weight info */}
        <Card style={{ marginBottom: '32px', background: tokens.colors.bgElevated }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Ultimo peso</span>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{lastWeight} kg</div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Obiettivo</span>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{profileData.targetWeight} kg</div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: tokens.colors.textMuted }}>Inizio</span>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{profileData.startWeight} kg</div>
            </div>
          </div>
        </Card>
        
        {/* Weight input */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: tokens.colors.textMuted, fontSize: '14px', marginBottom: '16px' }}>
            Quanto pesi oggi, {profileData.name}?
          </p>
          <WeightInput value={weight} onChange={setWeight} />
        </div>
        
        {/* Feedback */}
        {weight && (
          <div className="animate-in" style={{
            padding: '16px',
            background: isLoss ? `${tokens.colors.success}11` : `${tokens.colors.warning}11`,
            borderRadius: tokens.radius.md,
            marginBottom: '32px',
          }}>
            <span style={{ fontSize: '24px', marginRight: '8px' }}>
              {isLoss ? '📉' : parseFloat(weightDiff) === 0 ? '➡️' : '📈'}
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 600,
              color: isLoss ? tokens.colors.success : parseFloat(weightDiff) === 0 ? tokens.colors.textMuted : tokens.colors.warning,
            }}>
              {isLoss ? weightDiff : `+${Math.abs(parseFloat(weightDiff))}`} kg dall'inizio
            </span>
            {profile === 'carmen' && data.carmen.cyclePhase === 'mestruale' && (
              <p style={{ fontSize: '13px', color: tokens.colors.textMuted, marginTop: '8px' }}>
                🌸 Ricorda: durante il ciclo è normale trattenere liquidi!
              </p>
            )}
          </div>
        )}
        
        {/* Tips */}
        <Card style={{ marginBottom: '32px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            💡 Consigli per la pesata
          </h3>
          <ul style={{ fontSize: '13px', color: tokens.colors.textMuted, paddingLeft: '16px' }}>
            <li style={{ marginBottom: '4px' }}>Pesati sempre alla stessa ora (meglio al mattino)</li>
            <li style={{ marginBottom: '4px' }}>Prima di colazione, dopo il bagno</li>
            <li style={{ marginBottom: '4px' }}>Senza vestiti o con gli stessi vestiti</li>
            <li>Non farti ossessionare dalle fluttuazioni giornaliere!</li>
          </ul>
        </Card>
        
        <Button
          onClick={handleSave}
          fullWidth
          size="lg"
          disabled={!weight}
        >
          ✓ Salva peso
        </Button>
      </div>
    </div>
  );
};

// 8. CYCLE TRACKING (Carmen only)
const CycleScreen = ({ data, onBack, onUpdate }) => {
  const [cycleStart, setCycleStart] = useState(data.carmen.cycleStart);
  const [phase, setPhase] = useState(data.carmen.cyclePhase);
  
  const phases = [
    { id: 'mestruale', name: 'Mestruale', days: '1-5', icon: '🩸', note: 'Possibile ritenzione, fame aumentata' },
    { id: 'follicolare', name: 'Follicolare', days: '6-14', icon: '🌱', note: 'Energia alta, ottima per attività' },
    { id: 'ovulazione', name: 'Ovulazione', days: '14-16', icon: '🌸', note: 'Picco energetico' },
    { id: 'luteale', name: 'Luteale', days: '17-28', icon: '🍂', note: 'Voglie, gonfiore, irritabilità possibili' },
  ];
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg }}>
      <Header
        title="Ciclo Mestruale"
        subtitle="Traccia il tuo ciclo"
        onBack={onBack}
      />
      
      <div style={{ padding: '16px 24px' }}>
        <Card style={{ marginBottom: '24px', background: `${tokens.colors.carmen}11` }}>
          <p style={{ fontSize: '14px', color: tokens.colors.textSecondary }}>
            🌸 Tracciare il ciclo aiuta a capire le variazioni di peso e appetito.
            Non preoccuparti delle fluttuazioni durante il ciclo!
          </p>
        </Card>
        
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: tokens.colors.textMuted,
          marginBottom: '12px',
        }}>
          In che fase sei?
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {phases.map(p => (
            <div
              key={p.id}
              onClick={() => setPhase(p.id)}
              style={{
                padding: '16px',
                background: phase === p.id ? `${tokens.colors.carmen}22` : tokens.colors.bgCard,
                borderRadius: tokens.radius.md,
                cursor: 'pointer',
                border: `2px solid ${phase === p.id ? tokens.colors.carmen : 'transparent'}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px',
              }}>
                <span style={{ fontSize: '20px' }}>{p.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{p.name}</span>
                <span style={{
                  fontSize: '12px',
                  color: tokens.colors.textMuted,
                  marginLeft: 'auto',
                }}>
                  Giorni {p.days}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: tokens.colors.textMuted, marginLeft: '32px' }}>
                {p.note}
              </p>
            </div>
          ))}
        </div>
        
        <Button
          onClick={() => setPhase(null)}
          variant="ghost"
          fullWidth
          style={{ marginBottom: '24px' }}
        >
          Non sto tracciando il ciclo
        </Button>
        
        <Button
          onClick={() => onUpdate({ cyclePhase: phase })}
          fullWidth
          size="lg"
        >
          Salva
        </Button>
      </div>
    </div>
  );
};

// 8. DAY CLOSED SUCCESS
const DayClosedScreen = ({ profile, data, onContinue }) => {
  const profileData = data[profile];
  const partner = profile === 'manuel' ? 'carmen' : 'manuel';
  const partnerData = data[partner];
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: `radial-gradient(circle at center, ${tokens.colors.primary}11 0%, ${tokens.colors.bg} 70%)`,
      textAlign: 'center',
    }}>
      <div className="animate-in" style={{ marginBottom: '32px' }}>
        <div style={{
          fontSize: '80px',
          marginBottom: '16px',
          animation: 'pulse 1s ease-in-out infinite',
        }}>
          🎉
        </div>
        <h1 style={{
          fontFamily: tokens.fonts.display,
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '8px',
        }}>
          Giornata completata!
        </h1>
        <p style={{
          color: tokens.colors.textMuted,
          fontSize: '16px',
        }}>
          Grande {profileData.name}! 💪
        </p>
      </div>
      
      <Card className="animate-in stagger-1" glow style={{
        width: '100%',
        maxWidth: '320px',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '32px' }}>🔥</span>
          <span style={{
            fontSize: '48px',
            fontWeight: 700,
            fontFamily: tokens.fonts.display,
            color: tokens.colors.primary,
          }}>
            {profileData.streak + 1}
          </span>
        </div>
        <p style={{ color: tokens.colors.textMuted, fontSize: '14px' }}>
          giorni consecutivi
        </p>
      </Card>
      
      {/* Partner status */}
      <Card className="animate-in stagger-2" style={{
        width: '100%',
        maxWidth: '320px',
        marginBottom: '32px',
        background: tokens.colors.bgElevated,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '32px' }}>{partnerData.emoji}</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 600 }}>{partnerData.name}</p>
            <p style={{ fontSize: '13px', color: tokens.colors.textMuted }}>
              {/* Simulated - would check actual status */}
              Ha già chiuso la giornata! ✅
            </p>
          </div>
        </div>
      </Card>
      
      <Button
        className="animate-in stagger-3"
        onClick={onContinue}
        size="lg"
        style={{ width: '100%', maxWidth: '320px' }}
      >
        Continua →
      </Button>
    </div>
  );
};

// ============================================
// APP PRINCIPALE
// ============================================

export default function ManzAlloneApp() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [dailyTasks, setDailyTasks] = useState({
    manuel: { weight: false, meals: false, movement: false, hardDay: false },
    carmen: { weight: false, meals: false, movement: false, hardDay: false },
    ryan: { weight: false, meals: false, movement: false, hardDay: false },
  });
  const [mealsProgress, setMealsProgress] = useState({
    manuel: 0,
    carmen: 0,
    ryan: 0,
  });
  const [weeklyMovement, setWeeklyMovement] = useState({
    manuel: { done: 0, target: 4, todayDone: false },
    carmen: { done: 0, target: 4, todayDone: false },
    ryan: { done: 0, target: 3, todayDone: false },
  });
  const [waterCount, setWaterCount] = useState({
    manuel: 0,
    carmen: 0,
    ryan: 0,
  });
  const [savedMealStatuses, setSavedMealStatuses] = useState({
    manuel: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
    carmen: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
    ryan: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
  });
  const [savedMealSelections, setSavedMealSelections] = useState({
    manuel: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
    carmen: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
    ryan: {
      colazione: null,
      spuntino1: null,
      pranzo: null,
      spuntino2: null,
      cena: null,
    },
  });
  
  // Carica dati da Supabase all'avvio
  useEffect(() => {
    loadAllData();
  }, []);
  
  const loadAllData = async () => {
    setLoading(true);
    try {
      const today = getToday();
      const weekStart = getWeekStart();

      console.log('=== DEBUG loadAllData ===');
      console.log('Today (getToday()):', today);
      console.log('Week start:', weekStart);

      // Carica profili
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
      console.log('Profiles loaded:', profiles, 'Error:', profilesError);

      // Carica pesi
      const { data: weights, error: weightsError } = await supabase.from('weights').select('*');
      console.log('Weights loaded:', weights?.length, 'records', 'Error:', weightsError);

      // Carica log giornalieri di oggi
      const { data: dailyLogs, error: dailyLogsError } = await supabase.from('daily_logs').select('*');
      console.log('All daily_logs from Supabase:', dailyLogs, 'Error:', dailyLogsError);

      // Debug: mostra le date nei log per capire il formato
      if (dailyLogs && dailyLogs.length > 0) {
        console.log('Sample log dates:', dailyLogs.map(l => ({
          profile: l.profile_id,
          date: l.date,
          dateType: typeof l.date,
          water_count: l.water_count,
          meal_statuses: l.meal_statuses,
        })));
      }

      // Fix: confronta solo la parte YYYY-MM-DD della data (gestisce diversi formati)
      const todayLogs = dailyLogs?.filter(l => {
        const logDate = String(l.date).split('T')[0]; // Normalizza la data
        const matches = logDate === today;
        if (l.date) {
          console.log(`Comparing: logDate="${logDate}" vs today="${today}" => ${matches}`);
        }
        return matches;
      }) || [];
      console.log('Today logs (filtered):', todayLogs);
      console.log('Number of today logs found:', todayLogs.length);
      
      // Carica movimento settimanale
      const { data: weeklyData } = await supabase.from('weekly_movement').select('*');
      const thisWeekMovement = weeklyData?.filter(w => w.week_start === weekStart) || [];
      
      // Costruisci lo stato
      if (profiles && profiles.length > 0) {
        const newData = { ...initialData };
        
        profiles.forEach(p => {
          if (p.id === 'manuel' || p.id === 'carmen' || p.id === 'ryan') {
            newData[p.id] = {
              ...newData[p.id],
              startWeight: parseFloat(p.start_weight),
              targetWeight: parseFloat(p.target_weight),
              height: p.height,
              streak: p.streak || 0,
              streakProtectorAvailable: p.streak_protector_available,
              completedDays: p.completed_days || 0,
              cyclePhase: p.cycle_phase,
              waterTarget: p.water_target || (p.id === 'ryan' ? 4 : 8),
              weights: weights
                ?.filter(w => w.profile_id === p.id)
                .map(w => ({ date: w.date, value: parseFloat(w.value) }))
                .sort((a, b) => new Date(a.date) - new Date(b.date)) || [],
            };
          }
        });
        
        // Calcola dati coppia
        const manuelLost = newData.manuel.startWeight - (newData.manuel.weights[newData.manuel.weights.length - 1]?.value || newData.manuel.startWeight);
        const carmenLost = newData.carmen.startWeight - (newData.carmen.weights[newData.carmen.weights.length - 1]?.value || newData.carmen.startWeight);
        newData.couple.totalWeightLost = (manuelLost + carmenLost).toFixed(1);
        newData.couple.coupleStreak = Math.min(newData.manuel.streak, newData.carmen.streak);
        newData.couple.daysCompletedTogether = Math.min(newData.manuel.completedDays, newData.carmen.completedDays);
        
        setData(newData);
        
        // Carica tasks di oggi
        const newTasks = { ...dailyTasks };
        const newMealsProgress = { ...mealsProgress };
        const newMealStatuses = { ...savedMealStatuses };
        const newMealSelections = { ...savedMealSelections };
        const newWaterCount = { ...waterCount };

        todayLogs.forEach(log => {
          console.log('Processing log for profile:', log.profile_id, 'Full log:', log);
          if (log.profile_id === 'manuel' || log.profile_id === 'carmen' || log.profile_id === 'ryan') {
            newTasks[log.profile_id] = {
              weight: log.weight_done,
              meals: log.meals_done,
              movement: log.movement_done,
              hardDay: log.hard_day,
            };
            newMealsProgress[log.profile_id] = log.meals_progress || 0;
            newWaterCount[log.profile_id] = log.water_count || 0;
            console.log(`Extracted for ${log.profile_id}:`, {
              water_count: log.water_count,
              meals_progress: log.meals_progress,
              meal_statuses: log.meal_statuses,
              meal_selections: log.meal_selections,
              movement_done: log.movement_done,
            });
            if (log.meal_statuses) {
              newMealStatuses[log.profile_id] = log.meal_statuses;
            }
            if (log.meal_selections) {
              newMealSelections[log.profile_id] = log.meal_selections;
            }
          }
        });

        console.log('Final states to set:', {
          newTasks,
          newMealsProgress,
          newWaterCount,
          newMealStatuses,
          newMealSelections,
        });

        setDailyTasks(newTasks);
        setMealsProgress(newMealsProgress);
        setSavedMealStatuses(newMealStatuses);
        setSavedMealSelections(newMealSelections);
        setWaterCount(newWaterCount);

        // Carica movimento settimanale
        const newWeeklyMovement = { ...weeklyMovement };

        // Prima carica todayDone da daily_logs per tutti i profili
        ['manuel', 'carmen', 'ryan'].forEach(profileId => {
          const todayLog = todayLogs.find(l => l.profile_id === profileId);
          if (todayLog) {
            newWeeklyMovement[profileId] = {
              ...newWeeklyMovement[profileId],
              todayDone: todayLog.movement_done || false,
            };
          }
        });

        // Poi carica i dati settimanali da weekly_movement
        thisWeekMovement.forEach(wm => {
          if (wm.profile_id === 'manuel' || wm.profile_id === 'carmen' || wm.profile_id === 'ryan') {
            newWeeklyMovement[wm.profile_id] = {
              ...newWeeklyMovement[wm.profile_id],
              done: wm.done || 0,
              target: wm.target || (wm.profile_id === 'ryan' ? 3 : 4),
            };
          }
        });
        setWeeklyMovement(newWeeklyMovement);

        console.log('=== loadAllData COMPLETED ===');
        console.log('Final weeklyMovement state:', newWeeklyMovement);
      } else {
        console.log('No profiles found in database');
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    }
    setLoading(false);
  };
  
  // Salva log giornaliero su Supabase
  const saveDailyLog = async (profileId, updates) => {
    const today = getToday();
    const payload = {
      profile_id: profileId,
      date: today,
      ...updates,
    };
    console.log('=== DEBUG saveDailyLog ===');
    console.log('Saving daily log:', payload);
    try {
      // Usa on_conflict per specificare le colonne chiave per l'upsert
      const result = await supabase.from('daily_logs').upsert(payload, 'profile_id,date');
      console.log('Upsert result:', result);
      if (result.error) {
        console.error('Supabase upsert error:', result.error);
      } else {
        console.log('Upsert successful, data:', result.data);
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
    }
  };
  
  // Salva movimento settimanale
  const saveWeeklyMovement = async (profileId, done) => {
    const weekStart = getWeekStart();
    const payload = {
      profile_id: profileId,
      week_start: weekStart,
      done: done,
      target: profileId === 'ryan' ? 3 : 4,
    };
    console.log('=== DEBUG saveWeeklyMovement ===');
    console.log('Saving weekly movement:', payload);
    try {
      const result = await supabase.from('weekly_movement').upsert(payload, 'profile_id,week_start');
      console.log('Weekly movement upsert result:', result);
      if (result.error) {
        console.error('Weekly movement upsert error:', result.error);
      }
    } catch (error) {
      console.error('Errore salvataggio movimento:', error);
    }
  };
  
  const handleLogin = () => {
    setScreen('profileSelect');
  };
  
  const handleSelectProfile = (selected) => {
    if (selected === 'stats') {
      setScreen('stats');
    } else {
      setProfile(selected);
      setScreen('home');
    }
  };
  
  const handleNavigate = (destination) => {
    if (destination === 'profileSelect') {
      setScreen('profileSelect');
    } else if (destination === 'stats') {
      setScreen('stats');
    } else {
      setScreen(destination);
    }
  };
  
  const handleSaveWeight = async (newWeight) => {
    const today = getToday();
    
    // Salva su Supabase
    await supabase.from('weights').upsert({
      profile_id: profile,
      date: today,
      value: newWeight,
    });
    
    // Aggiorna stato locale
    const updatedData = { ...data };
    const existingIndex = updatedData[profile].weights.findIndex(w => w.date === today);
    if (existingIndex >= 0) {
      updatedData[profile].weights[existingIndex].value = newWeight;
    } else {
      updatedData[profile].weights.push({ date: today, value: newWeight });
    }
    setData(updatedData);
    
    // Mark weight task as done
    const newTasks = {
      ...dailyTasks,
      [profile]: { ...dailyTasks[profile], weight: true }
    };
    setDailyTasks(newTasks);
    
    // Salva daily log
    await saveDailyLog(profile, {
      weight_done: true,
      meals_done: newTasks[profile].meals,
      movement_done: newTasks[profile].movement,
      hard_day: newTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });

    setScreen('home');
  };

  const handleMealsSaved = async () => {
    const newTasks = {
      ...dailyTasks,
      [profile]: { ...dailyTasks[profile], meals: true }
    };
    setDailyTasks(newTasks);
    
    const newProgress = {
      ...mealsProgress,
      [profile]: 5
    };
    setMealsProgress(newProgress);
    
    await saveDailyLog(profile, {
      weight_done: newTasks[profile].weight,
      meals_done: true,
      movement_done: newTasks[profile].movement,
      hard_day: newTasks[profile].hardDay,
      meals_progress: 5,
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });

    setScreen('home');
  };

  const handleMealsProgress = async (count) => {
    const newProgress = {
      ...mealsProgress,
      [profile]: count
    };
    setMealsProgress(newProgress);
    
    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: dailyTasks[profile].meals,
      movement_done: dailyTasks[profile].movement,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: count,
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });
  };

  const handleMealStatusChange = async (statuses) => {
    const newStatuses = {
      ...savedMealStatuses,
      [profile]: statuses
    };
    setSavedMealStatuses(newStatuses);
    
    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: dailyTasks[profile].meals,
      movement_done: dailyTasks[profile].movement,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: statuses,
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });
  };

  const handleMealSelectionChange = async (selections) => {
    const newSelections = {
      ...savedMealSelections,
      [profile]: selections
    };
    setSavedMealSelections(newSelections);
    
    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: dailyTasks[profile].meals,
      movement_done: dailyTasks[profile].movement,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: savedMealStatuses[profile],
      meal_selections: selections,
      water_count: waterCount[profile],
    });
  };

  const handleMovementToggle = async (done) => {
    const current = weeklyMovement[profile];
    const wasDone = current.todayDone;
    const newDone = done
      ? (wasDone ? current.done : current.done + 1)
      : (wasDone ? current.done - 1 : current.done);

    const newWeeklyMovement = {
      ...weeklyMovement,
      [profile]: {
        ...current,
        todayDone: done,
        done: newDone
      }
    };
    setWeeklyMovement(newWeeklyMovement);

    // Aggiorna anche dailyTasks.movement per coerenza
    const newDailyTasks = {
      ...dailyTasks,
      [profile]: { ...dailyTasks[profile], movement: done }
    };
    setDailyTasks(newDailyTasks);

    // Salva movimento settimanale
    await saveWeeklyMovement(profile, newDone);

    // Salva nel daily log
    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: dailyTasks[profile].meals,
      movement_done: done,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });
  };

  const handleWaterChange = async (newCount) => {
    const newWaterCount = {
      ...waterCount,
      [profile]: newCount
    };
    setWaterCount(newWaterCount);

    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: dailyTasks[profile].meals,
      movement_done: weeklyMovement[profile]?.todayDone || false,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: newCount,
    });
  };

  const handleHardDay = async () => {
    const hardDayStatuses = {
      colazione: 'skipped',
      spuntino1: 'skipped',
      pranzo: 'skipped',
      spuntino2: 'skipped',
      cena: 'skipped',
    };
    
    setSavedMealStatuses({
      ...savedMealStatuses,
      [profile]: hardDayStatuses
    });
    setMealsProgress({
      ...mealsProgress,
      [profile]: 5
    });
    setDailyTasks({
      ...dailyTasks,
      [profile]: { ...dailyTasks[profile], meals: true, hardDay: true }
    });
    
    await saveDailyLog(profile, {
      weight_done: dailyTasks[profile].weight,
      meals_done: true,
      movement_done: dailyTasks[profile].movement,
      hard_day: true,
      meals_progress: 5,
      meal_statuses: hardDayStatuses,
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
    });

    setScreen('weight');
  };

  const handleCloseDay = async () => {
    // Update streak
    const updatedData = { ...data };
    updatedData[profile].streak += 1;
    updatedData[profile].completedDays += 1;
    
    // Aggiorna su Supabase
    await (await supabase.from('profiles').update({
      streak: updatedData[profile].streak,
      completed_days: updatedData[profile].completedDays,
    })).eq('id', profile);
    
    // Salva day_closed
    await saveDailyLog(profile, {
      weight_done: true,
      meals_done: true,
      movement_done: dailyTasks[profile].movement,
      hard_day: dailyTasks[profile].hardDay,
      meals_progress: mealsProgress[profile],
      meal_statuses: savedMealStatuses[profile],
      meal_selections: savedMealSelections[profile],
      water_count: waterCount[profile],
      day_closed: true,
    });

    // Ricalcola dati coppia
    const manuelLost = updatedData.manuel.startWeight - (updatedData.manuel.weights[updatedData.manuel.weights.length - 1]?.value || updatedData.manuel.startWeight);
    const carmenLost = updatedData.carmen.startWeight - (updatedData.carmen.weights[updatedData.carmen.weights.length - 1]?.value || updatedData.carmen.startWeight);
    updatedData.couple.totalWeightLost = (manuelLost + carmenLost).toFixed(1);
    updatedData.couple.coupleStreak = Math.min(updatedData.manuel.streak, updatedData.carmen.streak);
    updatedData.couple.daysCompletedTogether = Math.min(updatedData.manuel.completedDays, updatedData.carmen.completedDays);
    
    setData(updatedData);
    setScreen('dayClosed');
  };
  
  const handleCycleUpdate = async (updates) => {
    const updatedData = { ...data };
    updatedData.carmen = { ...updatedData.carmen, ...updates };
    setData(updatedData);
    
    // Salva su Supabase
    await (await supabase.from('profiles').update({
      cycle_phase: updates.cyclePhase,
    })).eq('id', 'carmen');
    
    setScreen('home');
  };
  
  const currentTasks = profile ? dailyTasks[profile] : { weight: false, meals: false, movement: false };
  const setCurrentTasks = (newTasks) => {
    if (profile) {
      setDailyTasks({ ...dailyTasks, [profile]: newTasks });
    }
  };
  
  // Schermata di caricamento
  if (loading) {
    return (
      <>
        <GlobalStyles />
        <AppContainer>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: tokens.colors.bg,
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🦁</div>
            <h1 style={{
              fontFamily: tokens.fonts.display,
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '16px',
              color: tokens.colors.primary,
            }}>
              ManzAllone
            </h1>
            <p style={{ color: tokens.colors.textMuted }}>Caricamento...</p>
          </div>
        </AppContainer>
      </>
    );
  }
  
  return (
    <>
      <GlobalStyles />
      <AppContainer>
        {screen === 'login' && (
          <LoginScreen onLogin={handleLogin} />
        )}
        
        {screen === 'profileSelect' && (
          <ProfileSelection
            onSelectProfile={handleSelectProfile}
            data={data}
          />
        )}
        
        {screen === 'home' && (
          <DailyHome
            profile={profile}
            data={data}
            onNavigate={handleNavigate}
            onCloseDay={handleCloseDay}
            tasks={currentTasks}
            setTasks={setCurrentTasks}
            mealsProgress={mealsProgress[profile] || 0}
            weeklyMovement={weeklyMovement[profile]}
            onMovementToggle={handleMovementToggle}
            onHardDay={handleHardDay}
            waterCount={waterCount[profile] || 0}
            waterTarget={data[profile]?.waterTarget || 8}
            onWaterChange={handleWaterChange}
          />
        )}
        
        {screen === 'weight' && (
          <WeightScreen
            profile={profile}
            data={data}
            onBack={() => setScreen('home')}
            onSave={handleSaveWeight}
          />
        )}
        
        {screen === 'meals' && (
          <MealsScreen
            profile={profile}
            data={data}
            onBack={() => setScreen('home')}
            onSave={handleMealsSaved}
            onProgress={handleMealsProgress}
            onStatusChange={handleMealStatusChange}
            onSelectionChange={handleMealSelectionChange}
            savedStatuses={savedMealStatuses[profile]}
            savedSelections={savedMealSelections[profile]}
          />
        )}
        
        {screen === 'shopping' && (
          <ShoppingList
            onBack={() => setScreen('home')}
          />
        )}
        
        {screen === 'stats' && (
          <StatsScreen
            data={data}
            onBack={() => setScreen('profileSelect')}
          />
        )}
        
        {screen === 'cycle' && (
          <CycleScreen
            data={data}
            onBack={() => setScreen('home')}
            onUpdate={handleCycleUpdate}
          />
        )}
        
        {screen === 'dayClosed' && (
          <DayClosedScreen
            profile={profile}
            data={data}
            onContinue={() => setScreen('profileSelect')}
          />
        )}
        
        {screen === 'partner' && (
          <DailyHome
            profile={profile === 'manuel' ? 'carmen' : 'manuel'}
            data={data}
            onNavigate={handleNavigate}
            onCloseDay={() => {}}
            tasks={dailyTasks[profile === 'manuel' ? 'carmen' : 'manuel']}
            setTasks={(t) => setDailyTasks({...dailyTasks, [profile === 'manuel' ? 'carmen' : 'manuel']: t})}
            waterCount={waterCount[profile === 'manuel' ? 'carmen' : 'manuel'] || 0}
            waterTarget={data[profile === 'manuel' ? 'carmen' : 'manuel']?.waterTarget || 8}
          />
        )}
      </AppContainer>
    </>
  );
}
