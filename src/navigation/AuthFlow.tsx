import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import React, { useState } from 'react';

import OtpVerifyScreen from '@/screens/auth/OtpVerifyScreen';
import PhoneLoginScreen from '@/screens/auth/PhoneLoginScreen';

type OtpStep = {
  phoneNumber: string;
  confirmation: FirebaseAuthTypes.ConfirmationResult;
};

/**
 * Small local state machine (not a navigator route) since the phone -> OTP
 * flow is linear and needs to hold onto the live ConfirmationResult object,
 * which isn't serializable and so can't be passed as a navigation param.
 */
export default function AuthFlow() {
  const [otpStep, setOtpStep] = useState<OtpStep | null>(null);

  if (otpStep) {
    return (
      <OtpVerifyScreen
        phoneNumber={otpStep.phoneNumber}
        confirmation={otpStep.confirmation}
        onVerified={() => undefined}
        onBack={() => setOtpStep(null)}
      />
    );
  }

  return (
    <PhoneLoginScreen
      onCodeSent={(phoneNumber, confirmation) => setOtpStep({ phoneNumber, confirmation })}
    />
  );
}
