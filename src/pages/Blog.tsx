import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, TrendingUp, FileText, Building2, Mail, CheckCircle2, Loader2, Users, MapPin, ChevronLeft, ChevronRight, Search, X, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Authentic project images
import sotoGrande1 from "@/assets/soto-grande-1.jpg";
import aziziVeniceAerial from "@/assets/azizi-venice-aerial.jpg";
import hiltonMaritimeLobby from "@/assets/hilton-maritime-lobby.webp";
import rakHero from "@/assets/rak-hero-new.webp";
import investiceHero from "@/assets/investice-hero.jpg";
import tiparHero from "@/assets/tipar-hero.jpg";

// Helper to parse Czech month names to sortable date
const parseDate = (dateStr: string): Date => {
  const monthMap: Record<string, number> = {
    "Leden": 0, "Únor": 1, "Březen": 2, "Duben": 3, "Květen": 4, "Červen": 5,
    "Červenec": 6, "Srpen": 7, "Září": 8, "Říjen": 9, "Listopad": 10, "Prosinec": 11
  };
  const parts = dateStr.split(" ");
  const month = monthMap[parts[0]] ?? 0;
  const year = parseInt(parts[1]) || 2025;
  return new Date(year, month, 1);
};

const blogArticles: Array<{
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  icon: typeof MapPin;
  readTime: string;
  date: string;
  featured: boolean;
}> = [];

const ARTICLES_PER_PAGE = 4;

const Blog = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Sort articles by date (newest first)
  const sortedArticles = useMemo(() => {
    return [...blogArticles].sort((a, b) => {
      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    });
  }, []);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return sortedArticles;
    const query = searchQuery.toLowerCase();
    return sortedArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [sortedArticles, searchQuery]);

  // Get featured article (only show if not searching)
  const featuredArticle = !searchQuery.trim() 
    ? (sortedArticles.find(a => a.featured) || sortedArticles[0])
    : null;
  
  // Get other articles (excluding featured when not searching)
  const otherArticles = searchQuery.trim() 
    ? filteredArticles 
    : filteredArticles.filter(a => a.slug !== featuredArticle?.slug);
  
  // Pagination
  const totalPages = Math.ceil(otherArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = otherArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: t("blog.errInvalidEmailTitle"),
        description: t("blog.errInvalidEmail"),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim(), source: "blog" });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: t("blog.alreadySubTitle"),
            description: t("blog.alreadySubDesc"),
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        setEmail("");
        toast({
          title: t("blog.okSubTitle"),
          description: t("blog.okSubDesc"),
        });
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast({
        title: t("blog.errTitle"),
        description: t("blog.errDesc"),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Editorial Dark Hero */}
      <section className="relative bg-foreground text-background pt-40 pb-24 -mt-[72px] overflow-hidden">
        <div className="container mx-auto px-8 relative">
          <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-background/50 mb-10">
            <Link to="/" className="flex items-center gap-1 hover:text-accent transition-colors">
              <Home className="w-3 h-3" />
              <span>{t("blog.home")}</span>
            </Link>
            <span className="text-background/30">/</span>
            <span className="text-background">{t("nav.blog")}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-12 gap-8 items-end"
          >
            <div className="md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/60">— Journal</span>
            </div>
            <div className="md:col-span-10">
              <h1 className="editorial-headline text-5xl md:text-7xl lg:text-[5.5rem] text-background mb-8 max-w-4xl text-balance">
                {t("blog.title").split(" ").slice(0, -1).join(" ")} <span className="italic text-accent">{t("blog.title").split(" ").slice(-1)}</span>
              </h1>
              <p className="text-base md:text-lg text-background/70 max-w-2xl font-light leading-relaxed">
                {t("blog.subtitle")}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container mx-auto px-8">
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("blog.searchPh")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-12 py-6 bg-secondary border-0 text-sm rounded-full font-light"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-4 text-center">
                {filteredArticles.length === 0
                  ? t("blog.noResults")
                  : t(filteredArticles.length === 1 ? "blog.foundOne" : "blog.foundMany", { count: filteredArticles.length })
                }
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-8">
            <div className="grid md:grid-cols-12 gap-6 mb-10">
              <div className="md:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">— Featured</span>
              </div>
              <div className="md:col-span-10">
                <h2 className="editorial-headline text-2xl md:text-3xl text-foreground">
                  Editor's <span className="italic text-accent">pick</span>
                </h2>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link to={featuredArticle.slug} className="block group">
                <div className="grid md:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden">
                    <img
                      src={featuredArticle.image}
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-6 left-6">
                      <span className="text-[10px] uppercase tracking-[0.3em] bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                        {t("blog.featured")}
                      </span>
                    </div>
                  </div>
                  <div className="p-10 md:p-14 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-6 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      <span>{featuredArticle.category}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{featuredArticle.readTime}</span>
                    </div>
                    <h2 className="editorial-headline text-3xl md:text-4xl text-foreground mb-5 group-hover:text-accent transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-muted-foreground font-light leading-relaxed mb-8">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex items-center justify-between border-t border-border pt-6">
                      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {featuredArticle.date}
                      </span>
                      <span className="flex items-center gap-2 text-accent text-xs uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
                        {t("blog.readArticle")}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Other Articles */}
      <section className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-6 mb-12">
            <div className="md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">— Latest</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-2xl md:text-3xl text-foreground">
                All <span className="italic text-accent">stories</span>
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {paginatedArticles.map((article, index) => (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link to={article.slug} className="block group">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-6">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    <span className="text-accent">{article.category}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{article.readTime}</span>
                  </div>
                  <h3 className="editorial-headline text-2xl text-foreground mb-3 group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground font-light leading-relaxed mb-5 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-2 text-accent text-xs uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
                      {t("blog.read")}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-16">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-full border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  onClick={() => handlePageChange(page)}
                  className={currentPage === page
                    ? "rounded-full bg-foreground text-background hover:bg-foreground/90"
                    : "rounded-full border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
                  }
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-full border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Categories Info */}
      <section className="py-24 bg-secondary border-t border-border">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-6 mb-16">
            <div className="md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">— Topics</span>
            </div>
            <div className="md:col-span-10">
              <h2 className="editorial-headline text-3xl md:text-4xl text-foreground">
                {t("blog.categoriesTitle").split(" ").slice(0, -1).join(" ")} <span className="italic text-accent">{t("blog.categoriesTitle").split(" ").slice(-1)}</span>
              </h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
            {[
              { num: "01", icon: TrendingUp, title: t("blog.catInvestment"), desc: t("blog.catInvestmentDesc") },
              { num: "02", icon: FileText, title: t("blog.catGuides"), desc: t("blog.catGuidesDesc") },
              { num: "03", icon: Building2, title: t("blog.catReports"), desc: t("blog.catReportsDesc") },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="bg-background p-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">— {num}</span>
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="editorial-headline text-xl text-foreground mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section — dark editorial */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-background/60">— Newsletter</span>
              <h2 className="editorial-headline text-4xl md:text-5xl text-background mt-4">
                {t("blog.newsletterTitle").split(" ").slice(0, -1).join(" ")} <span className="italic text-accent">{t("blog.newsletterTitle").split(" ").slice(-1)}</span>
              </h2>
              <p className="text-background/70 font-light mt-5 max-w-md leading-relaxed">
                {t("blog.newsletterDesc")}
              </p>
            </div>
            <div className="md:col-span-6">
              {isSubscribed ? (
                <div className="flex items-center gap-3 text-accent">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-serif text-xl">{t("blog.thanks")}</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder={t("blog.yourEmail")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-background/10 border-background/20 text-background placeholder:text-background/40 rounded-full h-12 px-5"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="submit"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-12 px-7 text-xs uppercase tracking-[0.2em]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("blog.submitting")}</>
                    ) : (
                      t("blog.subscribe")
                    )}
                  </Button>
                </form>
              )}
              <p className="text-xs text-background/40 mt-4 font-light">{t("blog.safe")}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
