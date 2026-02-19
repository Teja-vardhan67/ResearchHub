import arxiv

def search_arxiv(query: str, max_results: int = 5):
    """
    Searches arXiv for papers matching the query.
    """
    try:
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        results = []
        for result in search.results():
            results.append({
                "title": result.title,
                "authors": [author.name for author in result.authors],
                "summary": result.summary,
                "pdf_url": result.pdf_url,
                "published": result.published.strftime("%Y-%m-%d")
            })
        return results
    except Exception as e:
        print(f"Error searching arXiv: {e}")
        return []
