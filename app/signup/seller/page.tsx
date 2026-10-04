import SignupForm from '@/components/SignupForm';
export const metadata={title:'Become a Seller',description:'Apply to sell traditional Ghanaian smocks on Fuguaa.'};
export default function SellerSignup(){return <main className="container-x max-w-md py-16"><div className="card p-7"><p className="text-sm font-bold text-terracotta">SELL WITH FUGUAA</p><h1 className="mt-2 text-3xl font-black">Create your seller account</h1><p className="mt-2 text-black/60">After signup, you will complete your shop profile and identity verification.</p><SignupForm seller/></div></main>}
