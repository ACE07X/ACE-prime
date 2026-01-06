export async function register() {
    console.log('----------------------------------------');
    console.log('✅ Server started');
    console.log('PORT:', process.env.PORT || 3000);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SUPABASE:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('OPENAI:', !!process.env.OPENAI_API_KEY);
    console.log('----------------------------------------');
}
