CREATE TABLE IF NOT EXISTS news_related_products (
  article_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY(article_id,product_id)
);
CREATE TABLE IF NOT EXISTS news_related_articles (
  article_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  related_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  PRIMARY KEY(article_id,related_id),
  CONSTRAINT news_relation_not_self CHECK (article_id<>related_id)
);
