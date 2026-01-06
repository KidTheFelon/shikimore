import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

// Моки для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Моки для navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Моки для window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", {
  value: mockWindowOpen,
  writable: true,
});

describe("App", () => {
  const mockAnimeData = {
    items: [
      {
        id: 1,
        title: "Test Anime",
        url: "https://shikimori.one/animes/1",
        poster_url: "https://shikimori.one/poster.jpg",
        description: "Test description",
        score: 8.5,
        kind: "tv",
        status: "released",
        episodes: 12,
      },
    ],
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockWindowOpen.mockClear();
    mockInvoke.mockResolvedValue(mockAnimeData);
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("отображает заголовок", () => {
    render(<App />);
    expect(screen.getByText("Shikimore")).toBeInTheDocument();
  });

  it("загружает и отображает список аниме", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    expect(mockInvoke).toHaveBeenCalledWith("search_anime", {
      query: "",
      page: 1,
      limit: 20,
      kind: undefined,
    });
  });

  it("отображает постер аниме", async () => {
    render(<App />);

    await waitFor(() => {
      const poster = screen.getByAltText("Test Anime");
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute("src", "https://shikimori.one/poster.jpg");
    });
  });

  it("отображает метаданные аниме", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("⭐ 8.5")).toBeInTheDocument();
      expect(screen.getByText("TV")).toBeInTheDocument();
      expect(screen.getByText("released")).toBeInTheDocument();
      expect(screen.getByText("12 эп.")).toBeInTheDocument();
    });
  });

  it("выполняет поиск с debounce", async () => {
    const user = userEvent.setup();
    render(<App />);

    const searchInput = screen.getByPlaceholderText("Поиск аниме...");
    await user.type(searchInput, "naruto");

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith("search_anime", {
          query: "naruto",
          page: 1,
          limit: 20,
          kind: undefined,
        });
      },
      { timeout: 500 }
    );
  });

  it("фильтрует по типу аниме", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const kindFilter = screen.getByRole("combobox");
    await user.selectOptions(kindFilter, "tv");

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith("search_anime", {
          query: "",
          page: 1,
          limit: 20,
          kind: "tv",
        });
      },
      { timeout: 500 }
    );
  });

  it("обрабатывает ошибки", async () => {
    mockInvoke.mockRejectedValue(new Error("API Error"));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Ошибка:/)).toBeInTheDocument();
    });
  });

  it("отображает сообщение при пустом результате", async () => {
    mockInvoke.mockResolvedValue({ items: [], page: 1, limit: 20 });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
    });
  });

  it("переключает страницы", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const nextButton = screen.getByText("Вперед");
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("search_anime", {
        query: "",
        page: 2,
        limit: 20,
        kind: undefined,
      });
    });
  });

  it("блокирует кнопку 'Назад' на первой странице", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const prevButton = screen.getByText("Назад");
    expect(prevButton).toBeDisabled();
  });

  it("сохраняет поисковый запрос в localStorage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Поиск аниме/);
    await user.type(searchInput, "test query");

    await waitFor(() => {
      expect(localStorageMock.getItem("shikimore_last_search")).toBe("test query");
    });
  });

  it("загружает сохраненный поисковый запрос из localStorage", () => {
    localStorageMock.setItem("shikimore_last_search", "saved query");
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Поиск аниме/) as HTMLInputElement;
    expect(searchInput.value).toBe("saved query");
  });

  it("фокусирует поиск по Ctrl+K", async () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText(/Поиск аниме/) as HTMLInputElement;

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
  });

  it("очищает поиск по Esc", async () => {
    const user = userEvent.setup();
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Поиск аниме/) as HTMLInputElement;
    await user.type(searchInput, "test");
    expect(searchInput.value).toBe("test");

    searchInput.focus();
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(searchInput.value).toBe("");
    });
  });

  it("выполняет поиск по Enter", async () => {
    const user = userEvent.setup();
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Поиск аниме/);
    await user.type(searchInput, "naruto");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("search_anime", {
        query: "naruto",
        page: 1,
        limit: 20,
        kind: undefined,
      });
    });
  });

  it("сортирует результаты по рейтингу", async () => {
    const user = userEvent.setup();
    const sortedData = {
      items: [
        { ...mockAnimeData.items[0], id: 1, title: "Lower Score", score: 7.5 },
        { ...mockAnimeData.items[0], id: 2, title: "Higher Score", score: 9.5 },
      ],
      page: 1,
      limit: 20,
    };
    mockInvoke.mockResolvedValue(sortedData);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Lower Score")).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText("Сортировка");
    await user.selectOptions(sortSelect, "score");

    await waitFor(() => {
      const higherScore = screen.getByText("Higher Score");
      const lowerScore = screen.getByText("Lower Score");
      const listItems = screen.getAllByRole("listitem");
      expect(listItems[0]).toContainElement(higherScore);
      expect(listItems[1]).toContainElement(lowerScore);
    });
  });

  it("открывает ссылку при клике на карточку", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const animeCards = screen.getAllByRole("listitem");
    expect(animeCards.length).toBeGreaterThan(0);

    await userEvent.click(animeCards[0]);
    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://shikimori.one/animes/1",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("копирует ссылку в буфер обмена", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const copyButton = screen.getByLabelText("Копировать ссылку");
    await user.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://shikimori.one/animes/1"
    );
  });

  it("отображает кнопку повтора при ошибке", async () => {
    mockInvoke.mockRejectedValue(new Error("API Error"));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Ошибка")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Повторить попытку");
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);
    expect(mockInvoke).toHaveBeenCalled();
  });

  it("имеет правильные ARIA атрибуты", async () => {
    render(<App />);

    const searchInput = screen.getByLabelText("Поиск аниме");
    expect(searchInput).toHaveAttribute("aria-describedby", "search-hint");

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const animeList = screen.getByRole("list");
    expect(animeList).toBeInTheDocument();

    const animeItems = screen.getAllByRole("listitem");
    expect(animeItems.length).toBeGreaterThan(0);
    expect(animeItems[0]).toHaveAttribute("aria-label");
  });

  it("прокручивает вверх при смене страницы", async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Test Anime")).toBeInTheDocument();
    });

    const nextButton = screen.getByText("Вперед");
    await user.click(nextButton);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });

    scrollToSpy.mockRestore();
  });
});
