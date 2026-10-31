const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const searchButton = document.querySelector("#search-button");
let activeRequest;
let requestId = 0;

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const searchText = input.value.trim();

    if (searchText === "") {
        status.textContent = "Please enter a book title or author.";
        input.focus();
        return;
    }

    if (activeRequest) {
        activeRequest.abort();
    }

    const request = new AbortController();
    activeRequest = request;
    const currentRequestId = ++requestId;
    results.replaceChildren();
    status.textContent = "Searching...";
    status.classList.add("is-loading");
    searchButton.disabled = true;

    try {
        const parameters = new URLSearchParams({
            q: searchText,
            limit: "12",
            fields: "key,title,author_name,first_publish_year,cover_i"
        });
        const response = await fetch(
            `https://openlibrary.org/search.json?${parameters.toString()}`,
            { signal: request.signal }
        );

        if (!response.ok) {
            throw new Error(`Open Library returned ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data.docs)) {
            throw new Error("Open Library returned an unexpected response");
        }
        if (currentRequestId !== requestId) {
            return;
        }

        if (data.docs.length === 0) {
            status.textContent = "No books found. Try another search.";
            return;
        }

        const resultCount = Number(data.numFound);
        status.textContent = Number.isFinite(resultCount)
            ? `Showing ${data.docs.length} of ${resultCount.toLocaleString()} books`
            : `Showing ${data.docs.length} books`;

        data.docs.forEach(function (book) {
            const card = document.createElement("article");
            card.className = "book";

            if (book.cover_i) {
                const cover = document.createElement("img");
                cover.className = "book-cover";
                cover.src = `https://covers.openlibrary.org/b/id/${encodeURIComponent(book.cover_i)}-M.jpg`;
                cover.alt = `Cover of ${book.title || "this book"}`;
                cover.loading = "lazy";
                cover.onerror = function () {
                    cover.remove();
                };
                card.appendChild(cover);
            } else {
                const coverPlaceholder = document.createElement("div");
                coverPlaceholder.className = "cover-placeholder";
                coverPlaceholder.setAttribute("aria-hidden", "true");
                coverPlaceholder.textContent = "BOOK";
                card.appendChild(coverPlaceholder);
            }

            const details = document.createElement("div");
            details.className = "book-details";
            const title = document.createElement("h2");
            title.textContent = book.title || "Title unknown";

            const author = document.createElement("p");
            author.className = "book-author";
            author.textContent = Array.isArray(book.author_name) && book.author_name.length
                ? book.author_name.join(", ")
                : "Author unknown";

            const year = document.createElement("p");
            year.className = "book-year";
            year.textContent = `First published · ${book.first_publish_year || "Year unknown"}`;

            details.appendChild(title);
            details.appendChild(author);
            details.appendChild(year);
            card.appendChild(details);

            if (typeof book.key === "string" && book.key.startsWith("/")) {
                const link = document.createElement("a");
                link.className = "book-link";
                link.href = `https://openlibrary.org${book.key}`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "View book ↗";
                link.setAttribute("aria-label", `View ${book.title || "book"} on Open Library`);
                card.appendChild(link);
            }
            results.appendChild(card);
        });
    } catch (error) {
        if (error.name === "AbortError" || currentRequestId !== requestId) {
            return;
        }
        console.error("Could not load books from Open Library:", error);
        status.textContent = "Could not load books. Check your connection and try again.";
    } finally {
        if (currentRequestId === requestId) {
            activeRequest = null;
            searchButton.disabled = false;
            status.classList.remove("is-loading");
        }
    }
});

form.requestSubmit();
