import React, { useState } from "react";

const COUNSELORS = [
  {
    name: "Dr. Jane Smith",
    specialty: "Licensed Therapist",
    city: "New York",
    distance: "2 miles",
    avatar: "🧑‍⚕️",
  },
  {
    name: "John Coulombe",
    specialty: "Community Support",
    city: "New York",
    distance: "5 miles",
    avatar: "🧑‍💼",
  },
  {
    name: "Dr. Emily Lee",
    specialty: "Psychologist",
    city: "San Francisco",
    distance: "1 mile",
    avatar: "👩‍⚕️",
  },
  {
    name: "Sarah Kim",
    specialty: "Counselor",
    city: "San Francisco",
    distance: "3 miles",
    avatar: "👩‍💼",
  },
  {
    name: "Dr. Alex Brown",
    specialty: "Therapist",
    city: "Chicago",
    distance: "4 miles",
    avatar: "🧑‍⚕️",
  },
  {
    name: "Lisa Green",
    specialty: "Support Worker",
    city: "Chicago",
    distance: "2 miles",
    avatar: "👩‍💼",
  },
];

const LOCATIONS = [...Array.from(new Set(COUNSELORS.map((c) => c.city)))];

const FindHelp: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  const filteredCounselors = selectedLocation
    ? COUNSELORS.filter((c) => c.city === selectedLocation)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">
          Find Help Near You
        </h1>
        <div className="mb-8">
          <label
            htmlFor="location"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Select your location:
          </label>
          <select
            id="location"
            className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">-- Choose a city --</option>
            {LOCATIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        {selectedLocation && (
          <div>
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Recommended Counselors in {selectedLocation}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCounselors.map((counselor, idx) => (
                <div
                  key={idx}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col items-center shadow hover:shadow-lg transition"
                >
                  <div className="text-5xl mb-2">{counselor.avatar}</div>
                  <div className="text-lg font-bold text-blue-800 mb-1">
                    {counselor.name}
                  </div>
                  <div className="text-blue-600 mb-1">
                    {counselor.specialty}
                  </div>
                  <div className="text-gray-500 mb-2">
                    {counselor.distance} away
                  </div>
                  <button className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-lg shadow transition">
                    Chat Now
                  </button>
                </div>
              ))}
            </div>
            {filteredCounselors.length === 0 && (
              <div className="text-gray-400 text-center mt-6">
                No counselors found for this location.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindHelp;
