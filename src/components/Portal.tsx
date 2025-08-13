"use client";

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    setContainer(document.getElementById('ui-layer'));
  }, []);

  return container ? createPortal(children, container) : null;
}

