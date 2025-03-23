// @ts-nocheck
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Container,
	Divider,
	FormControl,
	Grid,
	InputLabel,
	List,
	ListItem,
	ListItemText,
	MenuItem,
	Paper,
	Select,
	TextField,
	Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

function App() {
	const [topics, setTopics] = useState("");
	const [articlesPerTopic, setArticlesPerTopic] = useState(5);
	const [timeRange, setTimeRange] = useState("2weeks");
	const [articles, setArticles] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [searchHistory, setSearchHistory] = useState([]);
	const [expandedTopics, setExpandedTopics] = useState([]);
	const [historicalArticles, setHistoricalArticles] = useState({});

	// Load search history from localStorage on component mount
	useEffect(() => {
		const savedHistory = localStorage.getItem("searchHistory");
		const savedArticles = localStorage.getItem("historicalArticles");
		if (savedHistory) {
			setSearchHistory(JSON.parse(savedHistory));
		}
		if (savedArticles) {
			setHistoricalArticles(JSON.parse(savedArticles));
		}
	}, []);

	const getStartDate = (range) => {
		const today = new Date();
		switch (range) {
			case "1week":
				return new Date(today.setDate(today.getDate() - 7));
			case "2weeks":
				return new Date(today.setDate(today.getDate() - 14));
			case "1month":
				return new Date(today.setMonth(today.getMonth() - 1));
			case "2months":
				return new Date(today.setMonth(today.getMonth() - 2));
			case "quarter":
				return new Date(today.setMonth(today.getMonth() - 3));
			default:
				return new Date(today.setDate(today.getDate() - 7));
		}
	};

	const handleSearch = async () => {
		setLoading(true);
		setError(null);

		try {
			const topicsList = topics.split(",").map((topic) => topic.trim());
			const allArticles = [];
			const startDate = getStartDate(timeRange);

			for (const topic of topicsList) {
				const response = await axios.post(
					"https://api.perplexity.ai/chat/completions",
					{
						model: "sonar-pro",
						messages: [
							{
								role: "system",
								content:
									"You are a helpful assistant that provides recent news articles. You must ALWAYS respond with a valid JSON array containing article objects. Each article object must have exactly these fields: title (string), url (string), summary (string), published_date (string), and published_by (string). Only include articles from websites with a Domain Authority (DA) score of 70 or higher. Do not include any text before or after the JSON array.",
							},
							{
								role: "user",
								content: `Find ${articlesPerTopic} recent articles about ${topic} published after ${
									startDate.toISOString().split("T")[0]
								}. Only include articles from high-authority websites with a Domain Authority (DA) score of 70 or higher. Return ONLY a JSON array of article objects, each with title, url, summary, published_date, and published_by fields. Example format: [{"title": "Article Title", "url": "https://example.com", "summary": "Article summary...", "published_date": "2024-01-01", "published_by": "article source name"}]`,
							},
						],
						temperature: 0.7,
					},
					{
						headers: {
							Authorization: `Bearer ${process.env.REACT_APP_PERPLEXITY_API_KEY}`,
							"Content-Type": "application/json",
						},
					}
				);

				try {
					const content = response.data.choices[0].message.content.trim();
					const articles = JSON.parse(content);

					if (!Array.isArray(articles) || articles.length === 0) {
						setArticles([]);
						setError("Content not available. Try choosing a bigger timeframe or different topics.");
						return;
					}

					// Validate each article has required fields
					articles.forEach((article) => {
						if (!article.title || !article.url || !article.summary || !article.published_date || !article.published_by) {
							throw new Error("Article missing required fields");
						}
					});

					allArticles.push(...articles.map((article) => ({ ...article, topic })));
				} catch (parseError) {
					console.error("Failed to parse API response:", parseError);
					console.error("Raw response:", response.data.choices[0].message.content);
					setArticles([]);
					setError("Content not available. Try choosing a bigger timeframe or different topics.");
				}
			}

			setArticles(allArticles);

			// Add to search history using localStorage
			const searchParams = {
				topics,
				articlesPerTopic,
				timeRange,
				timestamp: new Date().toISOString(),
			};

			// Get existing history
			const existingHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");

			// Check if the same search parameters exist
			const existingIndex = existingHistory.findIndex(
				(item) => item.topics === topics && item.articlesPerTopic === articlesPerTopic && item.timeRange === timeRange
			);

			let updatedHistory;
			if (existingIndex !== -1) {
				// Update timestamp of existing search
				updatedHistory = [...existingHistory];
				updatedHistory[existingIndex] = searchParams;
			} else {
				// Add new search to history
				updatedHistory = [searchParams, ...existingHistory].slice(0, 10); // Keep last 10 searches
			}

			// Save to localStorage
			updatedHistory.sort((a, b) => {
				return new Date(b.timestamp) - new Date(a.timestamp);
			});
			localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
			setSearchHistory(updatedHistory);

			// Save articles to historical articles
			const existingArticles = JSON.parse(localStorage.getItem("historicalArticles") || "{}");
			existingArticles[searchParams.timestamp] = allArticles;
			localStorage.setItem("historicalArticles", JSON.stringify(existingArticles));
			setHistoricalArticles(existingArticles);
		} catch (err) {
			setError(err.message || "Failed to fetch articles. Please check your API key and try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleHistoryClick = (search) => {
		setTopics(search.topics);
		setArticlesPerTopic(search.articlesPerTopic);
		setTimeRange(search.timeRange);
		setArticles([]); // Clear previous articles
	};

	const handleHistoryDownload = (search) => {
		const articles = historicalArticles[search.timestamp] || [];
		if (!articles.length) return;

		const currentTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const csvContent = [
			[
				"Topic",
				"Article Heading",
				"Article Summary",
				"Article Source Name",
				"Article Source Link",
				"Article Source Date Published",
				"Generated On",
			],
			...articles.map((article) => [
				article.topic,
				article.title.replace(/"/g, '""'),
				article.summary.replace(/"/g, '""'),
				article.published_by || "Unknown Source",
				article.url,
				article.published_date || "Unknown Date",
				new Date().toLocaleString(),
			]),
		]
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `articles_${currentTimestamp}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleAccordionChange = (topic) => (event, isExpanded) => {
		setExpandedTopics((prev) => (isExpanded ? [...prev, topic] : prev.filter((t) => t !== topic)));
	};

	const formatTimestamp = (timestamp) => {
		const date = new Date(timestamp);
		return date.toLocaleString();
	};

	const getTimeRangeLabel = (range) => {
		switch (range) {
			case "1week":
				return "Last 1 Week";
			case "2weeks":
				return "Last 2 Weeks";
			case "1month":
				return "Last 1 Month";
			case "2months":
				return "Last 2 Months";
			case "quarter":
				return "Past Quarter";
			default:
				return range;
		}
	};

	const handleDownloadCSV = () => {
		if (!articles.length) return;

		const currentTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const csvContent = [
			[
				"Topic",
				"Article Heading",
				"Article Summary",
				"Article Source Name",
				"Article Source Link",
				"Article Source Date Published",
				"Generated On",
			],
			...articles.map((article) => [
				article.topic,
				article.title.replace(/"/g, '""'),
				article.summary.replace(/"/g, '""'),
				article.published_by || "Unknown Source",
				article.url,
				article.published_date || "Unknown Date",
				new Date().toLocaleString(),
			]),
		]
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `articles_${currentTimestamp}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Typography variant="h4" component="h1" gutterBottom>
				Article Search by Topic
			</Typography>

			<Grid container spacing={3}>
				<Grid item xs={12} md={8}>
					<Box sx={{ mb: 4 }}>
						<Grid container spacing={2}>
							<Grid item xs={12} md={12}>
								<TextField
									fullWidth
									label="Topics (comma-separated)"
									value={topics}
									onChange={(e) => setTopics(e.target.value)}
									onKeyPress={(e) => {
										if (e.key === "Enter" && topics.trim()) {
											handleSearch();
										}
									}}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									type="number"
									label="Articles per topic"
									value={articlesPerTopic}
									onChange={(e) => setArticlesPerTopic(parseInt(e.target.value))}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<FormControl fullWidth>
									<InputLabel>Time Range</InputLabel>
									<Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
										<MenuItem value="2weeks">Last 2 Weeks</MenuItem>
										<MenuItem value="1month">Last 1 Month</MenuItem>
										<MenuItem value="2months">Last 2 Months</MenuItem>
										<MenuItem value="quarter">Past Quarter</MenuItem>
									</Select>
								</FormControl>
							</Grid>
						</Grid>
						<Box sx={{ mt: 2, display: "flex", gap: 2 }}>
							<Button variant="contained" onClick={handleSearch} disabled={loading || !topics.trim()}>
								{loading ? <CircularProgress size={24} /> : "Search Articles"}
							</Button>
							<Button variant="outlined" onClick={handleDownloadCSV} disabled={!articles.length} startIcon={<DownloadIcon />}>
								Download CSV
							</Button>
						</Box>
					</Box>

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					<Box sx={{ width: "100%" }}>
						{loading ? (
							<Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.50" }}>
								<CircularProgress size={40} sx={{ mb: 2 }} />
								<Typography variant="h6" color="grey.600">
									Searching for articles...
								</Typography>
							</Paper>
						) : articles.length > 0 ? (
							Object.entries(
								articles.reduce((acc, article) => {
									if (!acc[article.topic]) {
										acc[article.topic] = [];
									}
									acc[article.topic].push(article);
									return acc;
								}, {})
							).map(([topic, topicArticles]) => (
								<Accordion
									key={topic}
									expanded={expandedTopics.includes(topic)}
									onChange={handleAccordionChange(topic)}
									sx={{ mb: 1 }}
								>
									<AccordionSummary expandIcon={<ExpandMoreIcon />}>
										<Typography variant="h6">
											{topic} ({topicArticles.length} articles)
										</Typography>
									</AccordionSummary>
									<AccordionDetails>
										<List>
											{topicArticles.map((article, index) => (
												<React.Fragment key={index}>
													<ListItem>
														<Card sx={{ width: "100%", elevation: 0 }}>
															<CardContent>
																<Typography
																	variant="caption"
																	color="text.secondary"
																	sx={{ display: "block", mb: 0.5 }}
																>
																	Published on{" "}
																	{article.published_date || new Date().toISOString().split("T")[0]} by{" "}
																	{article.published_by || "Unknown Source"}
																</Typography>
																<Typography
																	variant="h6"
																	gutterBottom
																	sx={{
																		"& a": {
																			color: "primary.main",
																			textDecoration: "none",
																			"&:hover": {
																				textDecoration: "underline",
																			},
																		},
																	}}
																>
																	<a href={article.url} target="_blank" rel="noopener noreferrer">
																		{article.title}
																	</a>
																</Typography>
																<Typography variant="body2" color="text.secondary" paragraph>
																	{article.summary}
																</Typography>
															</CardContent>
														</Card>
													</ListItem>
													{index < topicArticles.length - 1 && <Divider />}
												</React.Fragment>
											))}
										</List>
									</AccordionDetails>
								</Accordion>
							))
						) : (
							<Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.50" }}>
								<Typography variant="h6" color="grey.600" gutterBottom>
									Content not available
								</Typography>
								<Typography variant="body2" color="grey.500">
									Try choosing a bigger timeframe or different topics
								</Typography>
							</Paper>
						)}
					</Box>
				</Grid>

				<Grid item xs={12} md={4}>
					<Paper
						sx={{
							p: 2,
							height: "calc(100vh - 200px)",
							display: "flex",
							flexDirection: "column",
							bgcolor: "grey.50",
							border: "1px solid",
							borderColor: "grey.200",
						}}
					>
						<Typography variant="h6" gutterBottom sx={{ color: "grey.700" }}>
							Search History
						</Typography>
						<List
							sx={{
								flex: 1,
								overflow: "auto",
								"&::-webkit-scrollbar": {
									width: "8px",
								},
								"&::-webkit-scrollbar-track": {
									background: "#f1f1f1",
								},
								"&::-webkit-scrollbar-thumb": {
									background: "#888",
									borderRadius: "4px",
								},
							}}
						>
							{searchHistory.map((search, index) => {
								const articles = historicalArticles[search.timestamp] || [];
								return (
									<React.Fragment key={search.timestamp}>
										<ListItem disablePadding sx={{ mb: 1 }}>
											<Card
												sx={{
													width: "100%",
													elevation: 0,
													border: "1px solid",
													borderColor: "grey.200",
													cursor: "pointer",
													"&:hover": {
														bgcolor: "grey.50",
														borderColor: "grey.300",
													},
												}}
												onClick={() => handleHistoryClick(search)}
											>
												<CardContent sx={{ py: 1.5 }}>
													<Typography variant="subtitle1" color="grey.800" gutterBottom>
														{search.topics}
													</Typography>
													<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
														<Typography variant="body2" color="grey.600">
															Articles per topic: {search.articlesPerTopic}
														</Typography>
														<Typography variant="body2" color="grey.600">
															Time Range: {getTimeRangeLabel(search.timeRange)}
														</Typography>
														<Typography variant="body2" color="grey.600">
															Total articles: {articles.length}
														</Typography>
														<Typography variant="body2" color="grey.500" sx={{ mt: 0.5 }}>
															Searched: {formatTimestamp(search.timestamp)}
														</Typography>
													</Box>
													{articles.length > 0 && (
														<Button
															variant="outlined"
															size="small"
															startIcon={<DownloadIcon />}
															onClick={(e) => {
																e.stopPropagation();
																handleHistoryDownload(search);
															}}
															sx={{ mt: 1 }}
														>
															Download CSV
														</Button>
													)}
												</CardContent>
											</Card>
										</ListItem>
										{index < searchHistory.length - 1 && <Divider sx={{ my: 1, borderColor: "grey.200" }} />}
									</React.Fragment>
								);
							})}
							{searchHistory.length === 0 && (
								<ListItem>
									<ListItemText primary="No search history yet" primaryTypographyProps={{ color: "grey.500" }} />
								</ListItem>
							)}
						</List>
					</Paper>
				</Grid>
			</Grid>
		</Container>
	);
}

export default App;
