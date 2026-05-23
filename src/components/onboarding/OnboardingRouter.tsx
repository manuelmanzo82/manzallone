'use client'

import { useOnboarding } from './OnboardingContext'
import { SectionWelcome } from './sections/SectionWelcome'
import { SectionAnagrafica } from './sections/SectionAnagrafica'
import { SectionObiettivi } from './sections/SectionObiettivi'
import { SectionAbitudiniAlimentari } from './sections/SectionAbitudiniAlimentari'
import { SectionPreferenzeAlimenti } from './sections/SectionPreferenzeAlimenti'
import { SectionIdratazioneAttivita } from './sections/SectionIdratazioneAttivita'
import { SectionSonnoBenessere } from './sections/SectionSonnoBenessere'
import { SectionNotifiche } from './sections/SectionNotifiche'
import { SectionPersonalitaCoach } from './sections/SectionPersonalitaCoach'
import { SectionPartner } from './sections/SectionPartner'
import { SectionRiepilogo } from './sections/SectionRiepilogo'

export function OnboardingRouter() {
  const { currentStep } = useOnboarding()

  switch (currentStep) {
    case 'welcome':
      return <SectionWelcome />
    case 'anagrafica':
      return <SectionAnagrafica />
    case 'obiettivi':
      return <SectionObiettivi />
    case 'abitudini':
      return <SectionAbitudiniAlimentari />
    case 'preferenze':
      return <SectionPreferenzeAlimenti />
    case 'idratazione_attivita':
      return <SectionIdratazioneAttivita />
    case 'sonno_benessere':
      return <SectionSonnoBenessere />
    case 'notifiche':
      return <SectionNotifiche />
    case 'personalita_coach':
      return <SectionPersonalitaCoach />
    case 'partner':
      return <SectionPartner />
    case 'riepilogo':
      return <SectionRiepilogo />
  }
}
