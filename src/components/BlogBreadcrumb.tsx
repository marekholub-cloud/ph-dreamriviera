import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BlogBreadcrumbProps {
  articleTitle: string;
}

export const BlogBreadcrumb = ({ articleTitle }: BlogBreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
      <Link 
        to="/" 
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Domů</span>
      </Link>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      <Link 
        to="/blog" 
        className="hover:text-primary transition-colors"
      >
        Blog
      </Link>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
        {articleTitle}
      </span>
    </nav>
  );
};
