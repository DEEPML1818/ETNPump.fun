import Layout from '../components/Layout';
import '../globals.css'; // your global styles if any

function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;
