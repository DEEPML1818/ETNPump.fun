import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/etnpump-logo.svg"
          alt="ETNPump.fun logo"
          width={200}
          height={50}
          priority
        />
        <h1>Welcome to ETNPump.fun</h1>
        <p>The ultimate decentralized token launching and trading platform on ETN Smart Chain.</p>
        
        <ol>
          <li>Launch your token instantly with our smart contract factory.</li>
          <li>Experience a fair, automated bonding curve pricing mechanism.</li>
          <li>Trade safely with anti-dump measures and dynamic fees.</li>
        </ol>

        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="/dashboard"
          >
            <Image
              className={styles.logo}
              src="/rocket.svg"
              alt="Launch icon"
              width={20}
              height={20}
            />
            Launch Your Token
          </a>
          <a
            href="/docs"
            className={styles.secondary}
          >
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
