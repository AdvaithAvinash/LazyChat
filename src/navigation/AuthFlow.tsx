import React, { useState } from 'react';

import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';

export default function AuthFlow() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  if (mode === 'signUp') {
    return <SignUpScreen onSwitchToSignIn={() => setMode('signIn')} />;
  }

  return <SignInScreen onSwitchToSignUp={() => setMode('signUp')} />;
}
