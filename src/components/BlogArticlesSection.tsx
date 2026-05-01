import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const featuredArticles: Array<{
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
}> = [];

export const BlogArticlesSection = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4">
            Blog
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Užitečné články pro investory
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Průvodci, analýzy a tipy pro úspěšné investování do nemovitostí v Dubaji
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {featuredArticles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/${article.slug}`} className="group block h-full">
                <Card className="h-full overflow-hidden bg-card border-border hover:border-primary/30 transition-all duration-300 group-hover:shadow-xl">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      {article.category}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3 h-3" />
                      {article.date}
                    </div>
                    <h3 className="font-serif font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                    <div className="mt-4 flex items-center text-sm text-primary font-medium">
                      Číst více
                      <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Button asChild variant="outline" size="lg">
            <Link to="/blog">
              Zobrazit všechny články
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
