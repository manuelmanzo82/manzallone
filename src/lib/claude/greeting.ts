// Picks the right opening line based on time + last meal state.
// The Claude API call uses this as a "directive" user-message in the system prompt,
// so the assistant generates something contextual but consistent.

export interface GreetingHint {
  shouldGreet: boolean
  directive: string | null
}

interface Args {
  hour: number
  hasMealsToday: boolean
  hasWeightToday: boolean
  firstTimeEver: boolean
}

export function computeGreetingHint({
  hour,
  hasMealsToday,
  hasWeightToday,
  firstTimeEver,
}: Args): GreetingHint {
  // Night: never auto-greet
  if (hour >= 22 || hour < 7) return { shouldGreet: false, directive: null }

  if (firstTimeEver) {
    return {
      shouldGreet: true,
      directive:
        'Saluta caldamente l\'utente per la prima volta dopo l\'onboarding. Una frase di benvenuto, poi proponi una micro-azione concreta in base all\'ora (pesata se mattina, suggerimento pasto se ora di pranzo/cena, registra acqua se pomeriggio). Massimo 3 frasi totali.',
    }
  }

  if (hour < 10) {
    return {
      shouldGreet: true,
      directive: hasWeightToday
        ? 'Saluta brevemente per la mattina e chiedi cosa ha in mente per colazione (o se l\'ha già fatta).'
        : 'Buongiorno: proponi di registrare il peso (è il dato più importante per calibrare i target). Una sola domanda concreta.',
    }
  }
  if (hour < 12) {
    return {
      shouldGreet: true,
      directive:
        'Saluto leggero di metà mattina. Se non ha registrato colazione chiedi se l\'ha fatta, altrimenti proponi spuntino o un check rapido sui macro.',
    }
  }
  if (hour < 15) {
    return {
      shouldGreet: true,
      directive: hasMealsToday
        ? 'Saluta a ora di pranzo. Chiedi se ha già pranzato o se vuole un suggerimento.'
        : 'Pranzo: proponi suggerimento adattivo (chiama suggest_next_meal e mostra le opzioni).',
    }
  }
  if (hour < 18) {
    return {
      shouldGreet: true,
      directive: 'Pomeriggio: chiedi se serve uno spuntino o se vuole loggare acqua/allenamento.',
    }
  }
  if (hour < 21) {
    return {
      shouldGreet: true,
      directive:
        'Ora di cena: chiedi cosa sta pensando o proponi suggerimento basato sul rimanente giornaliero.',
    }
  }
  // 21-22
  return {
    shouldGreet: true,
    directive: 'Sera tardi: chiedi se ha cenato e fai un check rapido sui macro di chiusura giornata.',
  }
}
