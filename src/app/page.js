"use client";

import Image from "next/image";
import styles from "./page.module.css";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { useCallback } from "react";

export default function Home() {
  const particlesInit = useCallback(async engine => {
    console.log(engine);
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async container => {
    console.log(container);
  }, []);

  return (
    <div className={styles.page}>
      {/* Render the animated particles background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          fullScreen: { enable: true, zIndex: -1 },
          background: {
            color: { value: "transparent"  }
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: { enable: true, mode: "push" },
              onHover: { enable: true, mode: "repulse" },
              resize: true,
            },
            modes: {
              push: { quantity: 4 },
              repulse: { distance: 200, duration: 0.4 },
            },
          },
          particles: {
            color: { value: "#00d18f" },
            links: {
              color: "#00d18f",
              distance: 150,
              enable: true,
              opacity: 0.5,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 6,
              straight: false,
            },
            number: {
              density: { enable: true, area: 800 },
              value: 80,
            },
            opacity: { value: 0.5 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 5 } },
          },
          detectRetina: true,
        }}
      />

      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/etnpumpfunlogo.png"
          alt="ETNPump.fun logo"
          width={200}
          height={200}
          priority
        />
        <h1>Welcome to ETNPump.fun</h1>
        <p>
          The ultimate decentralized token launching and trading platform on
          ETN Smart Chain.
        </p>
        <ol>
          <li>Launch your token instantly with our smart contract factory.</li>
          <li>Experience a fair, automated bonding curve pricing mechanism.</li>
          <li>Trade safely with anti-dump measures and dynamic fees.</li>
        </ol>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/dashboard">
            <Image
              className={styles.logo}
              src="/rocket.png"
              alt="Launch icon"
              width={20}
              height={20}
            />
            Launch Your Token
          </a>
          <a href="/docs" className={styles.secondary}>
            Read the Docs
          </a>
        </div>
      </main>
      <footer className={styles.footer}>
        <a href="/learn">
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn More
        </a>
        <a href="/examples">
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a href="https://etnpump.fun">
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Visit ETNPump.fun →
        </a>
      </footer>
    </div>
  );
}
